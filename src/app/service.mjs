import electron from 'electron'

import Store from 'electron-store'

import { ChatGPTAPI } from './gpt.mjs'

// import * as fs from 'fs'
// import * as path from 'path'
// const dbPath = path.join(process.cwd(), '.db.json')
// if(!fs.existsSync(dbPath)){
//   fs.writeFileSync(dbPath, '')
// }



const store = new Store()

const apiKey = store.get('apiKey')

const { ipcMain } = electron

const gpt = new ChatGPTAPI({
  maxModelTokens: 4000,
  apiKey: apiKey,
  fetch: () => {},
  debug: false
})

ipcMain.handle('fetchMessage', async (e, message) => {
  const {type, params} = JSON.parse(message)

  if(type === 'getFetchParams') {
    return await gpt.getMessages(params.text, {
      parentMessageId: params.parentMessageId
    })
  }

  if(type === 'setRes') {
    return await gpt.setRes(params)
  }
  
})
