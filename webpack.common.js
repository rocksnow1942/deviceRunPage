const path = require("path");
// var HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack")
const glob = require('glob');

module.exports = {
    // entry: glob.sync('./src/*/index.js').reduce((acc,item)=>{
    //     const path  = item.split('/');
    //     path.pop();
    //     const name = path.join('/');
    //     acc[name]  = item;
    //     return acc;
    // },{}),

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
