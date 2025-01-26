const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
    }),
  ],
};