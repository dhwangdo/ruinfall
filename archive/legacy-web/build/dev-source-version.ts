import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

const sourceDirectories = ["app", "public", "build"];
const sourceFiles = ["next.config.ts", "vite.config.ts", "tsconfig.json", "package.json", "package-lock.json"];

function latestModification(path: string): number {
  try {
    const stat = statSync(path);
    if (!stat.isDirectory()) return stat.mtimeMs;
    return readdirSync(path).reduce((latest, name) => Math.max(latest, latestModification(join(path, name))), stat.mtimeMs);
  } catch {
    return 0;
  }
}

/** A development-only timestamp: refreshing the browser does not make old code look new. */
export function devSourceVersion(): Plugin {
  let root = process.cwd();
  return {
    name: "ruinfall-dev-source-version",
    apply: "serve",
    configResolved(config) { root = config.root; },
    configureServer(server) {
      let updatedAt = new Date(Math.max(...[...sourceDirectories, ...sourceFiles]
        .map(path => latestModification(join(root, path))))).toISOString();
      const onSourceChange = (file: string) => {
        const path = relative(root, file).replaceAll("\\", "/");
        if (sourceDirectories.some(directory => path.startsWith(`${directory}/`)) || sourceFiles.includes(path)) {
          updatedAt = new Date().toISOString();
        }
      };
      server.watcher.on("add", onSourceChange).on("change", onSourceChange).on("unlink", onSourceChange);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", onSourceChange).off("change", onSourceChange).off("unlink", onSourceChange);
      });
      server.middlewares.use("/__ruinfall_dev_version", (_request, response) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify({ updatedAt }));
      });
    },
  };
}
