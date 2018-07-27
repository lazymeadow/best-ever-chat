const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
    mode: "development",
    entry: {
        main: './static/js/main.js',
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
                    presets: ['es2015']
                }
            }
        ]
    },
    stats: {
        colors: true
    },
    devtool: 'source-map',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'static/dist')
    },
    plugins: [
        new CircularDependencyPlugin({
            // exclude detection of files based on a RegExp
            exclude: /a\.js|node_modules/,
            // add errors to webpack instead of warnings
            failOnError: true,
            // set the current working directory for displaying module paths
            cwd: process.cwd(),
        })
    ]
};
