const path = require("path");
const common = require("./webpack.common");
const {merge} = require("webpack-merge");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(common, {
    mode: "production",
    output: {
        filename: "[name].[contentHash].bundle.js",
        path: path.resolve(__dirname, "dist/js"),
        publicPath: 'js/'
    },
    optimization: {
        minimizer: [
            new OptimizeCssAssetsPlugin(),
            new TerserPlugin(), // minify js
            new HtmlWebpackPlugin({
                template: "./src/index.html",
                filename: '../run.html',
                minify: {
                    removeAttributeQuotes: true,
                    // collapseWhitespace: true,
                    removeComments: true
                }
            }),
            // new HtmlWebpackPlugin({
            //     template: "./src/new.html",
            //     filename: '../new.html',
            //     minify: {
            //         removeAttributeQuotes: true,
            //         collapseWhitespace: true,
            //         removeComments: true
            //     }
            // })
        ],

        splitChunks: {
            maxSize: 200000,
            cacheGroups: {
                commons: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendors',
                  chunks: 'all'
                }
          }
        }

    },
    plugins: [
        new MiniCssExtractPlugin({ filename: "../css/[name].[contentHash].css" }),
        new CleanWebpackPlugin()
    ],
    module: {
        rules: [
            
            {
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        outputPath: '../fonts'
                    }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader", //2. Turns css into commonjs
                    {
                        loader: 'postcss-loader',
                        options: {
                          plugins: function () { // post css plugins, can be exported to postcss.config.js
                            return [
                              require('precss'),
                              require('autoprefixer')
                            ];
                          }
                        }
                      },
                    "sass-loader" //1. Turns sass into css
                ],
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader" //2. Turns css into commonjs
                    // "sass-loader" //1. Turns sass into css
                ]
            }
        ]
    }
})
