import esbuild from 'esbuild';

// Enhanced esbuild configuration for Replit deployment
esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  sourcemap: false,
  minify: true,
  // Exclude problematic Replit plugins during production build
  external: [
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-runtime-error-modal',
    'esbuild',
    'vite'
  ],
  // Handle environment-specific imports
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).catch(() => process.exit(1));