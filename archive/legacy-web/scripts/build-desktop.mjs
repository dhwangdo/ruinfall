import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { packager } from "@electron/packager";
import { desktopRuntime } from "./desktop-runtime.mjs";

if (!process.argv.includes("--package-only")) {
  const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    stdio: "inherit", env: { ...process.env, RUINFALL_DESKTOP_BUILD: "true" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const stage = path.resolve(`outputs/desktop-source-${Date.now()}`);
await mkdir(stage, { recursive: true });
// Next uses a custom distDir as the export output directory for output: export.
await cp(".next-desktop", path.join(stage, "game"), { recursive: true });
for (const name of ["main.cjs", "asset-path.cjs", "verify.cjs"]) await cp(`desktop/${name}`, path.join(stage, name));
await cp("app/assets/Pretendard-LICENSE.txt", path.join(stage, "Pretendard-LICENSE.txt"));
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(path.join(stage, "package.json"), JSON.stringify({ name: "ruinfall-desktop", productName: "Ruinfall", version, main: "main.cjs" }));
const png = await sharp("desktop/icon.svg").resize(256, 256).png().toBuffer();
await writeFile(path.join(stage, "icon.png"), png);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
const icon = path.resolve("outputs/desktop-icon.ico");
await writeFile(icon, Buffer.concat([header, png]));
const electronVersion = JSON.parse(await readFile("node_modules/electron/package.json", "utf8")).version;
const electronZipDir = await desktopRuntime(electronVersion);
const executable = await packager({
  dir: stage, name: "Ruinfall", platform: "win32", arch: "x64", out: "outputs/desktop",
  overwrite: true, asar: true, prune: false, icon,
  electronVersion, electronZipDir,
  win32metadata: { CompanyName: "Ruinfall", FileDescription: "Ruinfall offline game", ProductName: "Ruinfall" },
});
if (process.platform === "win32") {
  // Chromium's sandbox needs read/execute access when the workspace has AppContainer ACLs.
  const access = spawnSync("icacls", [path.resolve(executable[0]), "/grant", "*S-1-15-2-1:(OI)(CI)(RX)", "/T", "/Q"], { stdio: "inherit" });
  if (access.status !== 0) throw Error("Unable to grant sandbox read access to the packaged game");
}
console.log(`Local offline game: ${path.join(executable[0], "Ruinfall.exe")}`);
