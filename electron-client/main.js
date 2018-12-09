const {app, BrowserWindow, session, shell, Notification} = require('electron');
const path = require('path');

let mainWindow;
const secure = true;
const chatHost = 'becelectron.hi';

function createWindow() {
    mainWindow = new BrowserWindow({
        backgroundColor: '#25687D',
        width: 1600, height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });

    mainWindow.loadURL('https://becelectron.hi');

    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.on('message', (data, origin, source) => console.log(data, origin, source));

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [`default-src 'self' ${secure ? 'https' : 'http'}://${chatHost}; script-src ${secure ? 'https' : 'http'}://${chatHost} 'unsafe-inline' https://cdn.jsdelivr.net/sockjs/; connect-src ${secure ? 'wss' : 'ws'}://${chatHost} ${secure ? 'https' : 'http'}://${chatHost}; font-src ${secure ? 'https' : 'http'}://${chatHost} https://fonts.gstatic.com; img-src *; media-src https://s3-us-west-2.amazonaws.com/best-ever-chat-audio/`]
            }
        })
    })
}

app.setAppUserModelId('audreymavramccormick.bestevarchat.electronclient.1');

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== `${secure ? 'https' : 'http'}://${chatHost}`) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    })
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin === `${secure ? 'https' : 'http'}://${chatHost}` || parsedUrl.origin === `${secure ? 'wss' : 'ws'}://${chatHost}`) {
        event.preventDefault();
        callback(true);
    }
});

const {ipcMain} = require('electron');
const notifier = require('node-notifier');

ipcMain.on('BEC_send', (event, arg) => {
    console.log('sent something');
    console.log(arg);

    const argObj = (JSON.parse(arg));
    console.log(argObj);
});
ipcMain.on('BEC_receive', (event, arg) => {
    console.log('got something');
    console.log(arg);

    const argObj = (JSON.parse(arg));
    console.log(argObj);
});
ipcMain.on('BEC_notify', (event, arg) => {
    console.log('notification');
    console.log(arg);

    const argObj = (JSON.parse(arg));
    console.log(argObj);
    notifier.notify({
        title: 'Best Evar Chat 3.0',
        message: argObj.message
    });
});