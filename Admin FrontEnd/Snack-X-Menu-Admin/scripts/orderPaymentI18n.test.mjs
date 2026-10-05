import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SRC = join(import.meta.dirname, "..", "src");
const LOCALES = join(SRC, "i18n", "locales");
const NAMESPACE = "orderPayment";
/** Every language the feature must ship, not just the fully translated ones. */
const EXPECTED_LOCALES = ["en", "fr", "ar", "de", "es", "it", "ja", "ko", "zh"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** `orderPayment.payment.section` -> `payment.section` */
function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

function walkValues(object, prefix = "", visit) {
  for (const [key, value] of Object.entries(object)) {
    const path = `${prefix}${key}`;
    if (typeof value === "object" && value !== null) walkValues(value, `${path}.`, visit);
    else visit(path, value);
  }
}

const usedKeys = new Set();
for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  // Keys are always written as one string literal, never concatenated - except
  // the four states, which are interpolated as `orderPayment.status.${status}`.
  for (const match of source.matchAll(/[`"'](orderPayment\.[A-Za-z0-9_.]+)[`"']/g)) {
    usedKeys.add(match[1].slice(NAMESPACE.length + 1));
  }
  // `t(`orderPayment.status.${x}`)` - cover the literal part of the template.
  if (/orderPayment\.status\.\$\{/.test(source)) {
    for (const status of ["unpaid", "partial", "paid", "refunded"]) {
      usedKeys.add(`status.${status}`);
    }
  }
}

const localeFiles = readdirSync(LOCALES).filter((name) => name.endsWith(".json"));
const parsedByLocale = new Map(
  localeFiles.map((name) => [name, JSON.parse(readFileSync(join(LOCALES, name), "utf8"))])
);

test("the modal actually uses keys, otherwise this test is vacuous", () => {
  assert.ok(usedKeys.size >= 35, `only found ${usedKeys.size} keys`);
});

test("all nine languages ship a resource file", () => {
  const names = localeFiles.map((name) => name.replace(/\.json$/, ""));
  for (const locale of EXPECTED_LOCALES) {
    assert.ok(names.includes(locale), `missing locale file for ${locale}`);
  }
});

for (const [name, parsed] of parsedByLocale) {
  test(`${name} defines every key the payment modal uses`, () => {
    const keys = new Set(flatten(parsed[NAMESPACE] ?? {}));
    const missing = [...usedKeys].filter((key) => !keys.has(key)).sort();
    assert.deepEqual(missing, [], `${name} is missing: ${missing.join(", ")}`);
  });

  test(`${name} has no unused payment-modal keys`, () => {
    const keys = new Set(flatten(parsed[NAMESPACE] ?? {}));
    const unused = [...keys].filter((key) => !usedKeys.has(key)).sort();
    assert.deepEqual(unused, [], `${name} defines unused keys: ${unused.join(", ")}`);
  });

  test(`${name} has no empty payment-modal strings`, () => {
    const empties = [];
    walkValues(parsed[NAMESPACE] ?? {}, "", (path, value) => {
      if (typeof value === "string" && value.trim() === "") empties.push(path);
    });
    assert.deepEqual(empties.sort(), [], `${name} has empty values: ${empties.join(", ")}`);
  });
}

test("interpolation placeholders match across locales", () => {
  const placeholdersOf = (text) =>
    [...String(text).matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)]
      .map((match) => match[1])
      .sort();

  const referenceName = "en.json";
  const referenceValues = new Map();
  walkValues(parsedByLocale.get(referenceName)[NAMESPACE], "", (path, value) =>
    referenceValues.set(path, value)
  );

  for (const [name, parsed] of parsedByLocale) {
    if (!parsed[NAMESPACE]) continue;
    walkValues(parsed[NAMESPACE], "", (path, value) => {
      const expected = referenceValues.get(path);
      assert.deepEqual(
        placeholdersOf(value),
        placeholdersOf(expected),
        `${name} ${path} has different placeholders than ${referenceName}`
      );
    });
  }
});

test("the payment modal states stay translatable, not concatenated", () => {
  // The four states are read as `orderPayment.status.<lowercase status>`, so
  // the union has to be stable for any status the API can return.
  for (const locale of EXPECTED_LOCALES) {
    const status = parsedByLocale.get(`${locale}.json`)[NAMESPACE].status;
    assert.deepEqual(
      Object.keys(status).sort(),
      ["paid", "partial", "refunded", "unpaid"],
      `${locale} status keys drifted`
    );
  }
});

test("no key survives from the fields the API cannot supply", () => {
  // The order payload has no created date, notes or payment history, so the
  // translations for them must be gone - not just unused.
  const forbidden = [
    "orderDate",
    "orderNotes",
    "invoiceReady",
    "lastPayment",
    "submitError",
    "toast",
    "notes",
    "notesPlaceholder",
    "notesOptional",
    "payFull",
    "methodsLoading",
    "loadError",
  ];
  // `notes`/`payFull`/`methodsLoading` are legitimate, still-used keys; the rest
  // are the leftovers of the mocked version.
  const trulyRemoved = forbidden.filter(
    (key) => !["notes", "notesPlaceholder", "notesOptional", "payFull", "methodsLoading"].includes(key)
  );

  for (const locale of EXPECTED_LOCALES) {
    const block = parsedByLocale.get(`${locale}.json`)[NAMESPACE];
    for (const key of trulyRemoved) {
      assert.equal(block[key], undefined, `${locale} still defines ${NAMESPACE}.${key}`);
    }
    assert.equal(block.payment.date, undefined, `${locale} still defines payment.date`);
  }
});