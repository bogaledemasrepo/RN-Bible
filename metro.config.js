const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // 1. Inline Requires: Defer loading of modules until they are used.
    // This significantly reduces the initial TTI (Time to Interactive).
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    // 2. Minification: Use modern minifiers for smaller bundle sizes.
    minifierPath: 'metro-minify-terser',
  },
  // 3. Max Workers: Optimizes build speed on CI/CD machines.
  // Using 0 or a specific number based on CPU cores.
  maxWorkers: 4, 
  
  // 4. Asset handling: Ensure WebP and other optimized formats are supported.
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    assetExts: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__currentDir), config);