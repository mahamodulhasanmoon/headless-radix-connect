import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts', // Your TypeScript entry file
  output: {
    file: 'dist/index.mjs', // Output file with .mjs extension
    format: 'es', // ES module format
    sourcemap: true, // Generate sourcemap for debugging
  },
  external: ['@radixdlt/radix-connect-webrtc'], // Specify external dependencies
  plugins: [typescript()], // Use the TypeScript plugin
};
