/** Loader hooks backing `ts-resolve.mjs`. See that file for the why. */

/** Relative specifier with no extension, e.g. `./constants`. */
const BARE_RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$|\.json$/;

/**
 * `import.meta.env` is a Vite-ism that does not exist in plain Node, yet app
 * modules read it at module scope (e.g. `lib/tenant.ts` resolves the tenant from
 * `VITE_BASE_DOMAIN`). Shimming it from `process.env` keeps those modules
 * importable; unset VITE_* vars simply read as `undefined`, which is the same
 * falsy value Vite would give for a missing var.
 */
const ENV_SHIM = 'import.meta.env = { ...process.env };\n';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (BARE_RELATIVE.test(specifier) && !HAS_EXTENSION.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  // Not restricted on `format`: with type-stripping the format may already be
  // a JS-flavoured one, and a plain JS shim line is valid either way.
  if (!url.endsWith('.ts') || result.source == null) return result;
  const source = typeof result.source === 'string'
    ? result.source
    : Buffer.from(result.source).toString('utf8');
  return { ...result, source: ENV_SHIM + source };
}
