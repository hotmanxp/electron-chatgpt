/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

let lastFetchOptions = null

let lastMessageId = null
const url = 'https://api.openai.com/v1/chat/completions'

const ROLE_TYPE = {
  ME: 'Me',
  SYS: 'System',
  GPT: 'ChatGPT'
}

const setLoading = (loading) => {
  const loadingEle = document.getElementById('global-loading')
  if(loading) {
    loadingEle.classList.add('loading')
  } else {
    loadingEle.classList.remove('loading')
  }
}

const scrollLastToTop = () => {
  const targetY = 76
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
  const isMe = log.name === ROLE_TYPE.ME
  const logEle = document.createElement('div')
  logEle.className = `talk-container ${log.name}-wrap`
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

const removeLog = (logType) => {
  const dom = document.querySelector(`.${logType}-wrap`)
  if(!dom) return
  dom.parentElement.removeChild(dom)
}

const insertRetry = () => {
  insertLog({name: 'System', content: `<div >
  <div class="error-msg">Network Error, click btn to retry:</div>
  <div class="retry-btn btn">Retry</div>
  </div>` })
}

const sendMsgToApp = async (message) => {
  if(!window.callAppHandle) return
  return window.callAppHandle(JSON.stringify(message))
}

const ask = async (prompt, isRetry) => {
  if(!window.callAppHandle) return
  setLoading(true)
  let fetchOptions
  if(isRetry && lastFetchOptions) {
    fetchOptions = lastFetchOptions
    removeLog(ROLE_TYPE.SYS)

  } else {
    fetchOptions = await sendMsgToApp({
      type: 'getFetchParams',
      params: { text: prompt, parentMessageId: lastMessageId }
    })
    insertLog({name: ROLE_TYPE.ME, content: prompt})
  }

  lastFetchOptions = fetchOptions

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
      insertLog({...reply, name: ROLE_TYPE.GPT})
    })
    .catch(e => {
      console.log('接口调用错误: ', e)
      setLoading(false)
      // window.alert(`网络错误${e}`)
      insertRetry()

    })
  return
}

const inputEle = document.getElementById('input-el')

const promote = async () => {
  const inputText = inputEle.value
  inputEle.value = ''
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

document.getElementById('res-contain').addEventListener('click', (e) => {
  if(e.target.className.indexOf('retry-btn') > -1) {
    ask('', true)
  }
})

sendMsgToApp({
  type: 'resetApp',
  params: {}
})


