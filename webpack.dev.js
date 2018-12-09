const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CleanCSSPlugin = require('less-plugin-clean-css');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = [
    {
        name: "js",
        mode: "development",
        entry: {
            main: './static/js/main.js',
            mobile: './static/js/mobile.js',
            electron: './static/js/electron.js',
            login: './static/js/login.js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: [
                        path.resolve(__dirname, "static"),
                    ],
                    loader: 'babel-loader',
                    options: {
                        presets: ['env'],
                        plugins: ["transform-object-rest-spread"]
                    }
                }
            ]
        },
        stats: {
            colors: true
        },
        devtool: 'inline-source-map',
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'static/dist')
        },
        plugins: [
            new CleanWebpackPlugin([
                'static/dist/main.js',
                'static/dist/mobile.js',
                'static/dist/electron.js',
                'static/dist/login.js'
            ]),
            new CircularDependencyPlugin({
                // exclude detection of files based on a RegExp
                exclude: /a\.js|node_modules/,
                // add errors to webpack instead of warnings
                failOnError: true,
                // set the current working directory for displaying module paths
                cwd: process.cwd(),
            })
        ]
    },
    {
        name: "style",
        mode: "development",
        entry: {
            'main-style': './static/less/chat.less',
            'mobile-style': './static/less/mobile.less',
            'login-style': './static/less/login.less'
        },
        module: {
            rules: [
                {
                    test: /\.less$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: "css-loader"
                        },
                        {
                            loader: "less-loader",
                            options: {
                                paths: [
                                    path.resolve(__dirname, "static/less")
                                ],
                                plugins: [
                                    new CleanCSSPlugin({advanced: true})
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'fonts/',    // where the fonts will go
                            publicPath: './fonts'       // override the default path
                        }
                    }]
                }
            ]
        },
        output: {
            path: path.resolve(__dirname, 'static/dist')
        },
        plugins: [
            new CleanWebpackPlugin([
                'static/dist/main-style.css',
                'static/dist/main-style.js',
                'static/dist/mobile-style.css',
                'static/dist/mobile-style.js',
                'static/dist/login-style.css',
                'static/dist/login-style.js',
                'static/dist/fonts/'
            ]),
            new MiniCssExtractPlugin({
                filename: "[name].css"
            })
        ]
    }
];
