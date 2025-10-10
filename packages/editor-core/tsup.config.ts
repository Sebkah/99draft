import { defineConfig } from 'tsup';

export default defineConfig({
  name: 'editor-core',
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.build.json',

  clean: true,
  sourcemap: true,

  format: ['esm', 'cjs'],
  dts: true,
});
