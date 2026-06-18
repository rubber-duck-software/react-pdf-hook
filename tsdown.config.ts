import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  dts: true,
  sourcemap: true,
  clean: true,
  // pdfjs-dist is an optional peer used only for types; react/react-dom are peers.
  // None should be bundled into the published output.
  external: ['pdfjs-dist', 'react', 'react-dom']
})
