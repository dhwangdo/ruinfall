import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const engine = process.env.GODOT_BIN || path.join(root, "work/godot-tools/4.7.2/Godot_v4.7.2-stable_win64_console.exe");

test("Godot debug safe-area reentry rearms the full deck lock animation", { skip: !fs.existsSync(engine) }, () => {
  const log = path.join(root, "work", "safe-area-unlock-probe.log");
  const result = spawnSync(engine, ["--headless", "--path", path.join(root, "godot"),
    "--script", "res://tests/safe_area_unlock_probe.gd", "--log-file", log],
  { encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /SAFE_AREA_UNLOCK_PROBE=PASS/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /SCRIPT ERROR|Parse Error/);
});
