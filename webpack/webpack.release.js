const merge = require("webpack-merge");
const path = require("path");
const common = require("./webpack.common");
const webpack = require("webpack");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = merge(common, {
  mode: "production",
  devtool: "#source-map",
  entry: {
    prod: "./src/load.js",
    staging: "./src/load_staging.js"
  },
  output: {
    path: path.resolve(__dirname, "../dist"),
    publicPath: "/",
    filename: "[name].[hash].bundle.js"
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new webpack.DefinePlugin({
      __ENV__: JSON.stringify("PRODUCTION"),
      __API__: JSON.stringify("https://api.cacophony.org.nz"),
      __ENV_STAGING__: JSON.stringify("STAGING"),
      __API_STAGING__: JSON.stringify("https://api-test.cacophony.org.nz")
    }),
    new HtmlWebpackPlugin({
      filename: "index-prod.html",
      template: "index.template.ejs",
      excludeChunks: ["staging"],
      inject: "body"
    }),
    new HtmlWebpackPlugin({
      filename: "index-staging.html",
      template: "index.template.ejs",
      excludeChunks: ["prod"],
      inject: "body"
    }),
    new BundleAnalyzerPlugin({
      openAnalyzer: !process.env["IS_CI_ENV"],
      analyzerMode: process.env["IS_CI_ENV"] ? "disabled" : "server"
    })
  ],
  optimization: {
    splitChunks: {
      chunks: "all"
    },
    minimizer: [
      new UglifyJsPlugin({
        sourceMap: true
      })
    ]
  }
});
