const path = require("path");
const common = require("./webpack.common");
const {merge} = require("webpack-merge");
var HtmlWebpackPlugin = require("html-webpack-plugin");

const generateHtmlPlugin = title=>{
    return new HtmlWebpackPlugin({title,filename:'index.html',template:`./src/${title}/index.html`})
}
const populateHtmlPlugins = (nameArray) =>{
    return nameArray.map(name=>generateHtmlPlugin(name))
}


module.exports = merge(common, {
    mode: "development",
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist")
    },

    //plugins:populateHtmlPlugins(['ui','run']),

    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            filename: 'index.html',
        }),
        // new HtmlWebpackPlugin({
        //     template: "./src/new.html",
        //     filename: 'new.html',
        // }),
    ],
    module: {
        rules: [
            {
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                use: ['file-loader']
            },
            {
                test: /\.scss$/,
                use: [
                    "style-loader", //3. Inject styles into DOM
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
                    // {
                    //     loader: 'style-loader',
                       
                    //   },
                      
                    //   { loader: 'css-loader' },
                    //   {
                    //     loader: 'sass-loader',
                    //     options: {
                    //       // Prefer Dart Sass
                    //       implementation: require('sass'),
            
                    //       // See https://github.com/webpack-contrib/sass-loader/issues/804
                    //       webpackImporter: false,
                    //       sassOptions: {
                    //         includePaths: ['./node_modules']
                    //       },
                    //     },
                    //   },
                ]
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader", //3. Inject styles into DOM
                    "css-loader" //2. Turns css into commonjs
                    // "sass-loader" //1. Turns sass into css
                ]
            }
        ]
    }
})
