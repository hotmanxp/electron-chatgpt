/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

let lastMessageId = null
const url = 'https://api.openai.com/v1/chat/completions'

const setLoading = (loading) => {
  const loadingEle = document.getElementById('global-loading')
  if(loading) {
    loadingEle.classList.add('loading')
  } else {
    loadingEle.classList.remove('loading')
  }
}

const scrollLastToTop = () => {
  const targetY = 145
  const containnerEle = document.getElementById('res-contain')
  const logList = document.querySelectorAll('.talk-container')
  if(logList.length === 0) return
  const lastLogDiv = logList[logList.length - 1]
  const rect = lastLogDiv.getBoundingClientRect()
  const distance = rect.y - targetY
  containnerEle.scrollTo(0, containnerEle.scrollTop + distance)
}

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
  // ele.scrollTo(0, ele.scrollHeight - ele.clientHeight)
  scrollLastToTop()
}

const sendMsgToApp = async (message) => {
  if(!window.callAppHandle) return
  return window.callAppHandle(JSON.stringify(message))
}

const ask = async (prompt) => {
  if(!window.callAppHandle) return
  const fetchOptions = await sendMsgToApp({
    type: 'getFetchParams',
    params: { text: prompt, parentMessageId: lastMessageId }
  })

  insertLog({name: 'Me', content: prompt})

  fetch(url, {
    headers: fetchOptions.headers,
    method: 'POST',
    body: JSON.stringify(fetchOptions.body)
  })
    .then(res => res.json())
    .then(res => {
      lastMessageId = res.id
      const reply = res.choices[0].message
      window.callAppHandle(JSON.stringify({type :'setRes', params: {id: res.id, ...reply}}))
      setLoading(false)
      insertLog({...reply, name: 'ChatGPT'})
    })
    .catch(e => {
      console.log('接口调用错误: ', e)
      setLoading(false)
      window.alert(`网络错误${e}`)

    })
  return
}

const inputEle = document.getElementById('input-el')

const promote = async () => {
  const inputText = inputEle.value
  inputEle.value = ''
  setLoading(true)
  await ask(inputText)
}

document.getElementById('ask-button').addEventListener('click', promote)

inputEle.addEventListener('keyup', (ev) => {
  if(ev.code == 'Enter') {
    promote()
  }
})

document.getElementById('setting-el').addEventListener('click', () => {
  sendMsgToApp({
    type: 'openSetting',
    params: {}
  })
})


