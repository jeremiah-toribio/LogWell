const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" field resolution (fixes @iabtcf/core ESM issues)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
