// preload.js

const {ipcRenderer} = require('electron');

window.addEventListener('BEC_send', (event) => ipcRenderer.send('BEC_send', JSON.stringify(event.detail)));
window.addEventListener('BEC_receive', (event) => ipcRenderer.send('BEC_receive', JSON.stringify(event.detail.data)));
window.addEventListener('BEC_notify', (event) => ipcRenderer.send('BEC_notify', JSON.stringify(event.detail)));
