// Modules to control application life and create native browser window
// import './service'
import * as path from 'path'

import electron from 'electron'


const { app, BrowserWindow, ipcMain } = electron

import { ChatGPTAPI } from './gpt.mjs'




const apiKey = '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'




const gpt = new ChatGPTAPI({
  apiKey: apiKey,
  fetch: () => {},
  debug: false
})
ipcMain.handle('fetchMessage', async (message) => {

  const {type, params} = JSON.parse(message)
  if(type === 'getFetchParams') {
    return await gpt.getMessages(params.text)
  }
  if(type === 'setRes') {
    return await gpt._upsertMessage(params)
  }
  
})


function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.join(process.cwd(), 'preload.cjs')
    }
  })


  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
