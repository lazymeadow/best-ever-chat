const path = require('path');

module.exports = {
    mode: "development",
    entry: {
        client: './static/js/client.js',
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
    }
};
