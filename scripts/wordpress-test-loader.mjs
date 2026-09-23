import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
// Compile local TypeScript only for tests; runtime app modules remain ordinary Next modules.
export function loadTs(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const mod = { exports: {} };
  cache.set(path, mod);
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const localRequire = (name) =>
    name.startsWith(".")
      ? loadTs(
          resolve(dirname(path), name.endsWith(".ts") ? name : `${name}.ts`),
        )
      : nativeRequire(name);
  new Function("exports", "require", "module", outputText)(
    mod.exports,
    localRequire,
    mod,
  );
  return mod.exports;
}
