module.exports = {
  mode: 'modules',
  includeDeclarations: true,
  exclude: '**/*/index.d.ts',
  excludePrivate: true,
  excludeProtected: true,
  excludeExternals: true,
  // plugin: 'typedoc-plugin-internal-external',
  // ignoreCompilerErrors: true,
  moduleResolution: 'node',
  module: 'system'
};
