/**
 * Unit tests for the language normalization helper.
 *
 * `getLangCode()` is the single funnel every outbound language goes through
 * (the X-Lang header and the legacy `lang` body/query fields), so its edge cases
 * are worth pinning down: it must never emit anything outside
 * SUPPORTED_LANGUAGES, because the backend would reject or mis-localise it.
 *
 * Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getLangCode,
  getActiveLangCode,
  setActiveLang,
  resolveInitialLang,
} from '../src/lib/lang.ts';

const SUPPORTED = ['fr', 'ar', 'en', 'es', 'it', 'ja', 'zh', 'ko', 'de'];

test('passes through a bare supported code', () => {
  for (const code of SUPPORTED) {
    assert.equal(getLangCode(code), code);
  }
});

test('strips the region subtag: "ar-MA" -> "ar"', () => {
  assert.equal(getLangCode('ar-MA'), 'ar');
  assert.equal(getLangCode('en-GB'), 'en');
  assert.equal(getLangCode('zh-Hans-CN'), 'zh');
});

test('accepts an underscore separator: "fr_FR" -> "fr"', () => {
  assert.equal(getLangCode('fr_FR'), 'fr');
  assert.equal(getLangCode('fr_FR.UTF-8'), 'fr');
});

test('is case-insensitive: "EN" -> "en"', () => {
  assert.equal(getLangCode('EN'), 'en');
  assert.equal(getLangCode('Fr'), 'fr');
  assert.equal(getLangCode('AR-ma'), 'ar');
});

test('falls back to the app default for empty / blank input', () => {
  assert.equal(getLangCode(''), 'en');
  assert.equal(getLangCode('   '), 'en');
  assert.equal(getLangCode(undefined), 'en');
  assert.equal(getLangCode(null), 'en');
});

test('falls back to the app default for an unsupported language', () => {
  assert.equal(getLangCode('pt'), 'en');
  assert.equal(getLangCode('ru-RU'), 'en');
  assert.equal(getLangCode('sw-KE'), 'en');
});

test('never returns a non-string, so the header cannot be undefined', () => {
  for (const bad of [undefined, null, '', '   ', 'xx', 42, {}, []]) {
    assert.equal(typeof getLangCode(bad), 'string');
    assert.ok(SUPPORTED.includes(getLangCode(bad)));
  }
});

test('the active-language mirror follows setActiveLang', () => {
  setActiveLang('ar-MA');
  assert.equal(getActiveLangCode(), 'ar');
  setActiveLang('FR');
  assert.equal(getActiveLangCode(), 'fr');
});

test('the mirror rejects an unsupported switch and keeps the default', () => {
  setActiveLang('pt-BR');
  assert.equal(getActiveLangCode(), 'en');
});

test('resolveInitialLang always yields a supported code', () => {
  // No stored preference in a bare test environment, so it resolves via
  // device-language detection with a guaranteed-valid fallback.
  const initial = resolveInitialLang();
  assert.ok(SUPPORTED.includes(initial));
});
