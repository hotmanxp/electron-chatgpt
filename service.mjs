
// import fetchFn from 'node-fetch'
import { ChatGPTAPI } from './gpt.mjs'
import electron  from 'electron'

const { ipcMain } = electron

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


// addEventListener(())



// const printLoading = () => {
//   let basicText = 'Waiting'
//   let i = 0; 
//   const loader = setInterval(() => { 
//     i = (i + 1) % 7; 
//     const loadingText = basicText + "...........".substring(0, i)
//     process.stdout.clearLine()
//     process.stdout.cursorTo(0)
//     process.stdout.write(chalk.yellow(loadingText))
//   }, 300);
//   return () => {
//     process.stdout.clearLine()
//     clearInterval(loader)
//   }
// }

// const queryGPT = async(prompt, afterCb) => {
//   let stop
//   try {
//     // stop = printLoading()
//     const res = await gpt.sendMessage(prompt, {
//       conversationId: lastConversationId,
//       parentMessageId: parentMessageId
//     })
//     lastConversationId = res.conversationId,
//     parentMessageId = res.id
//     // stop()
//     console.log(chalk.green(`
// [Chat_GPT]:
//     `))
//     console.log(res.text)
//     console.log(chalk.gray(`
// === GPT End ===
//     `))
//   } catch(e) {
//     // stop()
//     if(e.statusCode === 429) {
//       console.log('服务器又挂了///')
//     } else {
//       console.log(e)
//     }
//   } finally {
//     afterCb()
//   }
// }


// let lastConversationId
// let parentMessageId

// const ask = async (msg) => {
//   if(msg) {
//     queryGPT(msg, ask)
//     return
//   }
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   })
//   rl.question(chalk.yellow('[Me]: '), async (prompt) => {
//     if(prompt === 'quit') {
//       console.log('Bye Bye...')
//       rl.close()
//       return
//     }
//     queryGPT(prompt, () => {
//       rl.close()
//       ask()
//     })
//   })
// }

// ask(defaultQuest)
