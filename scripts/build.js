require('esbuild')
  .build({
    entryPoints: ['lib/index.ts'],
    bundle: true,
    sourcemap: true,
    minify: false,
    loader: { '.ts': 'ts' },
    format: 'esm',
    target: ['esnext'],
    outdir: 'dist/cross-document-messenger',
    splitting: true,
  })
  .then(() => console.log('⚡ Done'))
  .catch(() => process.exit(1));
