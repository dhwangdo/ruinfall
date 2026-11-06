import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

export async function desktopRuntime(version) {
  const directory = path.resolve("outputs/electron-runtime");
  await mkdir(directory, { recursive: true });
  const name = `electron-v${version}-win32-x64.zip`;
  const zip = path.join(directory, name);
  const checksumFile = `${zip}.sha256`;
  const release = `https://github.com/electron/electron/releases/download/v${version}/`;
  let checksum = await readFile(checksumFile, "utf8").catch(() => null);
  if (!checksum) {
    const response = await fetch(`${release}SHASUMS256.txt`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw Error(`Runtime checksum download failed: ${response.status}`);
    const line = (await response.text()).split("\n").find(line => line.trim().split(/\s+/).at(-1)?.replace(/^\*/, "") === name);
    checksum = line?.trim().split(/\s+/)[0];
    if (!checksum || !/^[0-9a-f]{64}$/.test(checksum)) throw Error("Runtime checksum missing");
  }
  const digest = async () => {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(zip)) hash.update(chunk);
    return hash.digest("hex");
  };
  if (!(await stat(zip).catch(() => null)) || await digest() !== checksum) {
    console.log(`Downloading local runtime ${version}…`);
    const partial = `${zip}.download`;
    const offset = (await stat(partial).catch(() => null))?.size ?? 0;
    let response = await fetch(release + name, { signal: AbortSignal.timeout(900_000),
      headers: offset ? { Range: `bytes=${offset}-` } : {} });
    if (response.status === 416) response = await fetch(release + name, { signal: AbortSignal.timeout(900_000) });
    if (!response.ok || !response.body) throw Error(`Runtime download failed: ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial, { flags: response.status === 206 ? "a" : "w" }));
    await rename(partial, zip);
    if (await digest() !== checksum) throw Error("Runtime checksum mismatch");
    await writeFile(checksumFile, checksum);
  }
  return directory;
}
