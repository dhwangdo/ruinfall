import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

// These boundaries prevent a screen from silently forking either visual again.
test("screens render cards and consumables through their shared visual components", () => {
  const root = new URL("../app/", import.meta.url);
  const files = fs.readdirSync(new URL("components/", root)).filter(name => name.endsWith(".tsx"))
    .map(name => `components/${name}`).concat("page.tsx");
  const owners = new Map([["CardFace", "components/CardVisual.tsx"],
    ["ConsumableTicketTierMark", "components/ConsumableVisual.tsx"],
    ["itemStackStyle", "components/CardVisual.tsx|components/ConsumableVisual.tsx"]]);
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(new URL(file, root), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const importName = statement.moduleSpecifier.text.split("/").at(-1);
      if (owners.has(importName)) assert.ok(owners.get(importName).split("|").includes(file),
        `${file} must use CardVisual or ConsumableVisual instead of importing ${importName}`);
      assert.notEqual(importName, "DeckEditorCardIcon", "The old screen-specific renderer must not return");
    }
  }
});
