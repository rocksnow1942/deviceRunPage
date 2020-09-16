const path = require("path");
// var HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack")


module.exports = {
    entry: {
        main: "./src/index.js",
        // vendor: "./src/vendor.js"
        // css:"./src/app.scss"
    },
    plugins:[
        new webpack.ProvidePlugin({
            $:"jquery",
            jQuery: "jquery"
        })
    ],
    module: {
        rules: [
            {
                test: /\.html$/,
                use: ["html-loader"]
            },
            {
                test: /\.(svg|png|jpg|gif)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[hash].[ext]",
                        outputPath: "../imgs"
                    }
                }
            }
        ]
    }
};
