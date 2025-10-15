/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPoints: ['./src'],
  out: '../../apps/docs/public/api',
  exclude: ['**/node_modules/**', '**/*.test.ts'],
  excludePrivate: true,
  includeVersion: true,
  compilerOptions: {
    noUnusedLocals: false,
    noUnusedParameters: false,
  },
  options: {
    navigation: {
      includeCategories: true,
      includeGroups: true,
      excludeReferences: false,
      includeFolders: true,
    },
  },
};

export default config;
