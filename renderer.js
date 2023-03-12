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

const insertLog = (log) => {
  const ele = document.getElementById('res-contain')
  const htmlContent = window.marked.marked(log.content);
  const isMe = log.name === 'Me'
  const logEle = document.createElement('div')
  logEle.className = 'talk-container'
  logEle.innerHTML = `<div class="${isMe ? 'me': 'gpt'}">
    <div class="bg" >${log.name}</div>
    <div class="log-text">${htmlContent}</div>
  </div>
`

  ele.appendChild(logEle)
  // Highlight code blocks using hljs
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
  ele.scrollTo(0, ele.scrollHeight - ele.clientHeight)
}

const ask = async (prompt) => {

  if(window.callAppHanddle) {
    const message = JSON.stringify({
      type: 'getFetchParams',
      params: { text: prompt, parentMessageId: lastMessageId }
    })

    const fetchOptions = await window.callAppHanddle(message)
      insertLog({name: 'Me', content: prompt})
      fetch(url, {
        headers: fetchOptions.headers,
        method: 'POST',
        body: JSON.stringify(fetchOptions.body)
      })
      .then(res => res.json())
      .then(res => {
        console.log(res)
        lastMessageId = res.id
        const reply = res.choices[0].message
        window.callAppHanddle(JSON.stringify({type :'setRes', params: {id: res.id, ...reply}}))

        document.getElementById('global-loading').classList.remove('loading')
        insertLog({...reply, name: 'ChatGPT'})
      })
      .catch(e => {
        console.log(e)
        document.getElementById('global-loading').classList.remove('loading')
        window.alert(`网络错误${e}`)

      })

    return
  }
}

const inputEle = document.getElementById('input-el')

const promte = async () => {
  const inputText = inputEle.value
  inputEle.value = ''
  document.getElementById('global-loading').classList.add('loading')
  await ask(inputText)
}

document.getElementById('ask-button').addEventListener('click', promte)
inputEle.addEventListener('keyup', (ev) => {
  if(ev.code == 'Enter') {
    promte()
  }
})

