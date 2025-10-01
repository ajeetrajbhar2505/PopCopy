const dotenv = require('dotenv');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');
const env = dotenv.config().parsed || {};
module.exports = {
  plugins: [
    new WebpackObfuscator(
      {
        stringArray: true,
        stringArrayThreshold: 0.8,
        rotateStringArray: true,
        shuffleStringArray: true,
        identifierNamesGenerator: 'hexadecimal',
        debugProtection: true,
        debugProtectionInterval: 500,
        selfDefending: true,
        compact: true,
        disableConsoleOutput: true,
        sourceMap: false,
      },
      [
        'vendor.js', // exact file name
        'vendors~*.js', // glob-like pattern
        '**/vendor/*.js',
        'vendor.[0-9a-f]*.js',
      ]
    ),
  ],
};
 