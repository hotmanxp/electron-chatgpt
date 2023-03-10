/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const CHATGPT_MODEL = 'gpt-3.5-turbo'
const url = 'https://api.openai.com/v1/chat/completions'
let lastMessageId = null
const key = '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'

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${key}`
}

let systemMessage

if (systemMessage === undefined) {
  const currentDate = new Date().toISOString().split('T')[0]
  systemMessage = `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.\nKnowledge cutoff: 2021-09-01\nCurrent date: ${currentDate}`
}

const messages = [
  {
    role: 'system',
    content: systemMessage
  }
]

const ask = async (prompt) => {

  if(window.callAppHanddle) {
    const message = JSON.stringify({
      type: 'getFetchParams',
      params: { text: prompt }
    })

    const fetchOptions = await window.callAppHanddle(message)


      fetch(url, {
        headers: fetchOptions.headers,
        method: 'POST',
        body: JSON.stringify(fetchOptions.body)
      })
      .then(res => res.json())
      .then(res => {
        console.log(res) 
        const reply = res.choices[0].message
        window.callAppHanddle('setRes', reply)
        const lines = reply.content.split('\n')
        .map(c => `<div>${c}</div>`)
        document.getElementById('res-contain').innerHTML = lines.join('')
      })
      .catch(e => {
        console.log(e)
      })

    return
  }
  
  messages.push({
    role: 'user',
    content: prompt,
    name: undefined,
  })

  const body = {
    max_tokens: 4000,
    model: CHATGPT_MODEL,
    temperature: 0.8,
    top_p: 1.0,
    presence_penalty: 1.0,
    messages: messages.slice(-2)
  }
  try {
    fetch(url, {
      headers,
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(res => {
      console.log(res)
      lastMessageId = res.id
     
      const reply = res.choices[0].message
      messages.push(reply)
      const lines = reply.content.split('\n')
      .map(c => `<div>${c}</div>`)
      document.getElementById('res-contain').innerHTML = lines.join('')
    })
    .catch(e => {
      console.log(e)
    })
  } catch (e) {
    window.alert(e)
  }
}

const inputEle = document.getElementById('input-el')

const promte = async () => {
  const inputText = inputEle.value
  inputEle.value = ''
  document.getElementById('res-contain').innerHTML = 'Waiting...'
  await ask(inputText)
}

document.getElementById('ask-button').addEventListener('click', promte)
inputEle.addEventListener('keyup', (ev) => {
  if(ev.code == 'Enter') {
    promte()
  }
})

