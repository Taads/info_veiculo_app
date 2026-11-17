// Permite empacotar o pdf.js como arquivo .txt para ver PDFs sem internet.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('txt');

module.exports = config;
