import electron  from 'electron'

import { ChatGPTAPI } from './gpt.mjs'

const { ipcMain } = electron

const apiKey = process.env.OPEN_AI_KEY

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
