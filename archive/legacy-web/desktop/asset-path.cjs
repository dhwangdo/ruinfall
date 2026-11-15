const path = require("node:path");

/** Resolve only packaged files, never arbitrary files outside the game directory. */
function assetPath(root, requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== "ruinfall:" || url.hostname !== "game") return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes("\\") || pathname.includes("\0")) return null;
  const relative = pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative.endsWith("/") || relative === "" ? `${relative}index.html` : relative);
  const inside = path.relative(path.resolve(root), file);
  return inside.startsWith("..") || path.isAbsolute(inside) ? null : file;
}

module.exports = { assetPath };
