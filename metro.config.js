const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure package.json `exports` resolution is enabled (SDK 54 default).
// If a library causes "module not found" errors after installing new packages,
// run `npx expo start --clear` to flush the Metro cache.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
