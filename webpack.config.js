const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");

const env = dotenv.config().parsed;

const envKeys = Object.keys(env).reduce((acc, key) => {
  acc[`process.env.${key}`] = JSON.stringify(env[key]);
  return acc;
}, {});

module.exports = {
  entry: "./content.js",
  output: {
    filename: "content.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode: "development",
  devtool: "source-map",
  plugins: [new webpack.DefinePlugin(envKeys)],
};
