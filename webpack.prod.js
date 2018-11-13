const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CleanCSSPlugin = require('less-plugin-clean-css');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = [
    {
        name: "chat-js",
        mode: "production",
        entry: './static/js/main.js',
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
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'static/dist')
        },
        plugins: [
            new CleanWebpackPlugin(['static/dist/main.js']),
            new CircularDependencyPlugin({
                // exclude detection of files based on a RegExp
                exclude: /a\.js|node_modules/,
                // add errors to webpack instead of warnings
                failOnError: true,
                // set the current working directory for displaying module paths
                cwd: process.cwd()
            })
        ]
    },
    {
        name: "main-style",
        mode: "production",
        entry: {
            'main-style': './static/less/chat.less'
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
            new CleanWebpackPlugin(['static/dist/main-style.css', 'static/dist/main-style.js', 'static/dist/fonts/']),
            new MiniCssExtractPlugin({
                filename: "[name].css"
            })
        ]
    },
    {
        name: "login-js",
        mode: "production",
        entry: './static/js/login.js',
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
                }]
        },
        output: {
            filename: 'login.js',
            path: path.resolve(__dirname, 'static/dist')
        },
        plugins: [
            new CleanWebpackPlugin(['static/dist/login.js']),
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
        name: "login-style",
        mode: "production",
        entry: {
            'login-style': './static/less/login.less'
        },
        module: {
            rules: [
                {
                    test: /\.less$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        {
                            loader: "less-loader", options: {
                                paths: [
                                    path.resolve(__dirname, "static/less")
                                ],
                                plugins: [
                                    new CleanCSSPlugin({advanced: true})
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        stats: 'verbose',
        output: {
            path: path.resolve(__dirname, 'static/dist')
        },
        plugins: [
            new CleanWebpackPlugin(['static/dist/login-style.css', 'static/dist/login-style.js']),
            new MiniCssExtractPlugin({
                filename: "[name].css"
            })
        ],
        optimization: {
            minimizer: [new OptimizeCSSAssetsPlugin({})],
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'styles',
                        test: /\.css$/,
                        chunks: 'all',
                        enforce: true
                    }
                }
            }
        }
    }
];
