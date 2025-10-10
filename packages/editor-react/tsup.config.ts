import { defineConfig } from 'tsup';

export default defineConfig({
  name: 'editor-core',
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.build.json',

  // Bundle nothing from node_modules - all dependencies are external by default
  bundle: true,
  skipNodeModulesBundle: true,
  clean: true,

  format: ['esm', 'cjs'],
  dts: true,
});
