import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const backendFile =
  process.env.FEATURE_IDS_FILE ??
  path.resolve(
    frontendRoot,
    '..',
    '..',
    'backend',
    'NFC_Backend',
    'NFC_Backend',
    'Domain',
    'Constants',
    'FeatureIds.cs'
  );
const frontendFile = path.resolve(frontendRoot, 'src', 'features', 'catalog.ts');

function fail(message) {
  console.error(`Feature catalog check failed: ${message}`);
  process.exit(1);
}

function parseBackend(source) {
  const ids = new Map();
  const codes = new Map();

  for (const match of source.matchAll(
    /public\s+static\s+readonly\s+Guid\s+(\w+)\s*=\s*Guid\.Parse\("([^"]+)"\);/g
  )) {
    const [, name, id] = match;
    if (ids.has(name)) fail(`duplicate FeatureIds key "${name}"`);
    ids.set(name, id.toLowerCase());
  }

  for (const match of source.matchAll(
    /public\s+const\s+string\s+(\w+)\s*=\s*"([^"]+)";/g
  )) {
    const [, name, code] = match;
    if (codes.has(name)) fail(`duplicate FeatureCodes key "${name}"`);
    codes.set(name, code);
  }

  return { ids, codes };
}

function parseFrontend(source) {
  const entries = new Map();

  for (const match of source.matchAll(
    /^\s*(\w+):\s*\{\s*id:\s*'([^']+)',\s*code:\s*'([^']+)'\s*\},?\s*$/gm
  )) {
    const [, key, id, code] = match;
    if (entries.has(key)) fail(`duplicate FEATURES key "${key}"`);
    entries.set(key, { id: id.toLowerCase(), code });
  }

  return entries;
}

let backendSource;
let frontendSource;

try {
  backendSource = readFileSync(backendFile, 'utf8');
} catch {
  fail(`could not read backend constants at ${backendFile}`);
}

try {
  frontendSource = readFileSync(frontendFile, 'utf8');
} catch {
  fail(`could not read frontend catalog at ${frontendFile}`);
}

const { ids, codes } = parseBackend(backendSource);
const features = parseFrontend(frontendSource);

if (ids.size === 0) fail('no FeatureIds entries found');
if (codes.size === 0) fail('no FeatureCodes entries found');
if (features.size === 0) fail('no FEATURES entries found');
if (ids.size !== codes.size) {
  fail(`FeatureIds has ${ids.size} entries but FeatureCodes has ${codes.size}`);
}
if (features.size !== ids.size) {
  fail(`frontend has ${features.size} entries but backend has ${ids.size}`);
}

for (const key of new Set([...ids.keys(), ...codes.keys(), ...features.keys()])) {
  if (!ids.has(key)) fail(`missing FeatureIds key "${key}"`);
  if (!codes.has(key)) fail(`missing FeatureCodes key "${key}"`);
  if (!features.has(key)) fail(`missing FEATURES key "${key}"`);

  const expectedId = ids.get(key);
  const expectedCode = codes.get(key);
  const actual = features.get(key);

  if (actual.id !== expectedId) {
    fail(`id mismatch for "${key}": backend ${expectedId}, frontend ${actual.id}`);
  }
  if (actual.code !== expectedCode) {
    fail(`code mismatch for "${key}": backend ${expectedCode}, frontend ${actual.code}`);
  }
}

const usedIds = new Set();
const usedCodes = new Set();

for (const [key, { id, code }] of features) {
  if (usedIds.has(id)) fail(`duplicate frontend id "${id}"`);
  if (usedCodes.has(code)) fail(`duplicate frontend code "${code}"`);
  usedIds.add(id);
  usedCodes.add(code);
}

console.log(
  `Feature catalog check passed: ${features.size} features match across backend and frontend.`
);
