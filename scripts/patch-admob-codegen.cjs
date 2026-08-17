/**
 * Patches react-native-google-mobile-ads NativeAppModule spec so RN codegen
 * can parse it (CodegenTypes.UnsafeObject → Object).
 * See: https://github.com/invertase/react-native-google-mobile-ads/issues/849
 */
const fs = require('fs');
const path = require('path');

const roots = [
  'src/specs/modules/NativeAppModule.ts',
  'lib/typescript/specs/modules/NativeAppModule.d.ts',
  'lib/module/specs/modules/NativeAppModule.js',
  'lib/commonjs/specs/modules/NativeAppModule.js',
];

const pkgRoot = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-google-mobile-ads',
);

if (!fs.existsSync(pkgRoot)) {
  console.log('[patch-admob] package not installed; skipping');
  process.exit(0);
}

let patched = 0;
for (const rel of roots) {
  const file = path.join(pkgRoot, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('CodegenTypes.UnsafeObject') && !before.includes("CodegenTypes")) {
    continue;
  }
  const after = before
    .replace(/import type \{ CodegenTypes \} from ['"]react-native['"];\n?/g, '')
    .replace(/CodegenTypes\.UnsafeObject/g, 'Object');
  if (after !== before) {
    fs.writeFileSync(file, after);
    patched += 1;
    console.log('[patch-admob] patched', rel);
  }
}

if (patched === 0) {
  console.log('[patch-admob] already patched or nothing to do');
} else {
  console.log(`[patch-admob] applied ${patched} file(s)`);
}
