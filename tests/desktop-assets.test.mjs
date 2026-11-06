import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createRequire } from "node:module";
const { assetPath } = createRequire(import.meta.url)("../desktop/asset-path.cjs");

test("desktop routes the home page and exported assets without a localhost server", () => {
  const root = path.resolve("outputs/test-game");
  assert.equal(assetPath(root, "ruinfall://game/?device=desktop"), path.join(root, "index.html"));
  assert.equal(assetPath(root, "ruinfall://game/_next/static/chunk.js"), path.join(root, "_next/static/chunk.js"));
  assert.equal(assetPath(root, "ruinfall://game/fonts/test%20font.woff2"), path.join(root, "fonts/test font.woff2"));
});

test("desktop asset routing rejects other origins and encoded filesystem escapes", () => {
  const root = path.resolve("outputs/test-game");
  for (const url of ["https://game/", "ruinfall://other/", "ruinfall://game/..%2f..%2fsecret",
    "ruinfall://game/%5csecret", "ruinfall://game/%00", "ruinfall://game/%invalid"]) {
    assert.equal(assetPath(root, url), null, url);
  }
});
