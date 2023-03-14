import Store from'electron-store'
import promote from 'electron-prompt'

const store = new Store()

const promoteKeySetting = async () => {
  try {
    const key = await promote({
      title: '输入OpenAI的key',
      label: 'OpenAI Key',
      value: '',  // 初始值
      inputAttrs: { // 输入框属性
        type: 'text'
      },
      minWidth: 800,
      minHeight: 300,
      type: 'input' // 输入框类型
    })
    if(key) {
      store.set('apiKey', key)
    }
    return key
  } catch(e) {
    return null
  }
}

export {
  promoteKeySetting
}