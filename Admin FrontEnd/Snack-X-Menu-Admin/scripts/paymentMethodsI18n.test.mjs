import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SRC = join(import.meta.dirname, "..", "src");
const LOCALES = join(SRC, "i18n", "locales");
const NAMESPACE = "paymentsMethods";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** `paymentsMethods.form.addTitle` -> `form.addTitle` */
function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const usedKeys = new Set();
for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  // Keys are always written as one string literal, never concatenated.
  for (const match of source.matchAll(/[`"'](paymentsMethods\.[A-Za-z0-9_.]+)[`"']/g)) {
    usedKeys.add(match[1].slice(NAMESPACE.length + 1));
  }
}

const localeFiles = readdirSync(LOCALES).filter((name) => name.endsWith(".json"));
const parsedByLocale = new Map(
  localeFiles.map((name) => [name, JSON.parse(readFileSync(join(LOCALES, name), "utf8"))])
);
/** `null` when the locale file is partial and does not carry this namespace. */
const defined = new Map(
  [...parsedByLocale].map(([name, parsed]) => [
    name,
    parsed[NAMESPACE] === undefined ? null : new Set(flatten(parsed[NAMESPACE])),
  ])
);

test("the feature actually uses keys, otherwise this test is vacuous", () => {
  assert.ok(usedKeys.size > 50, `only found ${usedKeys.size} keys`);
});

for (const [name, keys] of defined) {
  // A locale that ships this namespace must ship all of it; a partial locale
  // is free to omit it entirely.
  if (keys) {
    test(`${name} defines every key the payment-methods UI uses`, () => {
      const missing = [...usedKeys].filter((key) => !keys.has(key)).sort();
      assert.deepEqual(missing, [], `${name} is missing: ${missing.join(", ")}`);
    });

    test(`${name} has no unused payment-methods keys`, () => {
      const unused = [...keys].filter((key) => !usedKeys.has(key)).sort();
      assert.deepEqual(unused, [], `${name} defines unused keys: ${unused.join(", ")}`);
    });
  }
}

test("interpolation placeholders match across locales", () => {
  const placeholdersOf = (text) =>
    [...String(text).matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((match) => match[1]).sort();

  const parsed = [...parsedByLocale]
    .filter(([, value]) => value[NAMESPACE] !== undefined)
    .map(([name, value]) => [name, value[NAMESPACE]]);
  const [referenceName, reference] = parsed[0];

  const walkValues = (object, prefix = "", visit) => {
    for (const [key, value] of Object.entries(object)) {
      const path = `${prefix}${key}`;
      if (typeof value === "object" && value !== null) walkValues(value, `${path}.`, visit);
      else visit(path, value);
    }
  };

  const referenceValues = new Map();
  walkValues(reference, "", (path, value) => referenceValues.set(path, value));

  for (const [name, other] of parsed.slice(1)) {
    walkValues(other, "", (path, value) => {
      const expected = referenceValues.get(path);
      if (typeof expected !== "string") return;
      assert.deepEqual(
        placeholdersOf(value),
        placeholdersOf(expected),
        `${name} ${path} has different placeholders than ${referenceName}`
      );
    });
  }
});