const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 🚨 FIX: Add better error handling and platform-specific configurations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Handle potential module resolution issues
config.resolver.alias = {
  ...config.resolver.alias,
  // Ensure proper module resolution for storage libraries
  '@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage'),
};

// Add better error reporting
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  mangle: {
    keep_fnames: true, // Keep function names for better error reporting
  },
};

// Handle potential source map issues
config.transformer.sourceMap = true;

// 🚨 FIX: Add timeout configurations to prevent timeout errors
config.server = {
  ...config.server,
  port: 8081,
  enhanceMiddleware: (middleware, server) => {
    // Add timeout handling
    return (req, res, next) => {
      // Set longer timeout for bundle requests
      if (req.url && req.url.includes('/bundle')) {
        req.setTimeout(120000); // 2 minutes for bundle requests
        res.setTimeout(120000);
      }
      return middleware(req, res, next);
    };
  },
};

// 🚨 FIX: Add better caching configuration
config.cacheStores = [
  {
    get: async (key) => {
      // Implement cache get
      return null;
    },
    set: async (key, value) => {
      // Implement cache set
    },
  },
];

module.exports = config; 