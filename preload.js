/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */



import('electron')
.then(m => {
  const { ipcRenderer } = m
window.addEventListener('DOMContentLoaded', () => {
  // const replaceText = (selector, text) => {
  //   const element = document.getElementById(selector)
  //   if (element) element.innerText = text
  // }

  // for (const type of ['chrome', 'node', 'electron']) {
  //   replaceText(`${type}-version`, process.versions[type])
  
  // }
  console.log('hello', ipcRenderer)

  document.text = 'good'
console.log('www==>', window)


})

window.callAppHanddle = async (message) => {
  return await ipcRenderer.invoke('fetchMessage', message)
}


})