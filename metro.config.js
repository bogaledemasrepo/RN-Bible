const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Crucial: Tell Metro to bundle .db files as assets
config.resolver.assetExts.push('db');

module.exports = config;