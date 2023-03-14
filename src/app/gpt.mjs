import Keyv from "keyv"
import * as uuid from "uuid"
import * as tiktoken from "@dqbd/tiktoken"

import QuickLRU from "../vendor/quick-lru"

import { promoteKeySetting } from './utils.mjs'

const uuidv4 = uuid.v4
const { get_encoding } = tiktoken
const tokenizer = get_encoding("cl100k_base")


function encode(input) {
  return tokenizer.encode(input);
}

let lastSentMessageId
let lastRespondMessageId
const CHATGPT_MODEL = "gpt-3.5-turbo"
const USER_LABEL_DEFAULT = "User"
const ASSISTANT_LABEL_DEFAULT = "ChatGPT"
const ChatGPTAPI = class {
  /**
   * Creates a new client wrapper around OpenAI's chat completion API, mimicing the official ChatGPT webapp's functionality as closely as possible.
   *
   * @param apiKey - OpenAI API key (required).
   * @param apiBaseUrl - Optional override for the OpenAI API base URL.
   * @param debug - Optional enables logging debugging info to stdout.
   * @param completionParams - Param overrides to send to the [OpenAI chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
   * @param maxModelTokens - Optional override for the maximum number of tokens allowed by the model's context. Defaults to 4096.
   * @param maxResponseTokens - Optional override for the minimum number of tokens allowed for the model's response. Defaults to 1000.
   * @param messageStore - Optional [Keyv](https://github.com/jaredwray/keyv) store to persist chat messages to. If not provided, messages will be lost when the process exits.
   * @param getMessageById - Optional function to retrieve a message by its ID. If not provided, the default implementation will be used (using an in-memory `messageStore`).
   * @param upsertMessage - Optional function to insert or update a message. If not provided, the default implementation will be used (using an in-memory `messageStore`).
   * @param fetch - Optional override for the `fetch` implementation to use. Defaults to the global `fetch` function.
   */
  constructor(opts) {
    const {
      apiKey,
      apiBaseUrl = "https://api.openai.com",
      debug = false,
      messageStore,
      completionParams,
      systemMessage,
      maxModelTokens = 4e3,
      maxResponseTokens = 1e3,
      getMessageById,
      upsertMessage,
    } = opts
    this._apiKey = apiKey
    this._apiBaseUrl = apiBaseUrl
    this._debug = !!debug
    this._completionParams = {
      model: CHATGPT_MODEL,
      temperature: 0.8,
      top_p: 1,
      presence_penalty: 1,
      ...completionParams
    };
    this._systemMessage = systemMessage;
    if (this._systemMessage === void 0) {
      const currentDate = (new Date()).toISOString().split("T")[0]
      this._systemMessage = `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.
Knowledge cutoff: 2021-09-01
Current date: ${currentDate}`
    }
    this._maxModelTokens = maxModelTokens
    this._maxResponseTokens = maxResponseTokens
    this._getMessageById = getMessageById || this._defaultGetMessageById
    this._upsertMessage = upsertMessage ||  this._defaultUpsertMessage
    if (messageStore) {
      this._messageStore = messageStore;
    } else {
      this._messageStore = new Keyv({
        store: new QuickLRU({ maxSize: 1e4 })
      })
    }
    // if (!this._apiKey) {
    //   throw new Error("OpenAI missing required apiKey")
    // }


  }

  async getKey () {
    if(this._apiKey) return this._apiKey
    const key = await promoteKeySetting()
    this._apiKey = key
    return key

  }

  async getMessages(text, opts = {}) {
    const {
      parentMessageId,
      messageId = uuidv4(),
      // timeoutMs,
      // onProgress,
      // stream = onProgress ? true : false
    } = opts;

    const apiKey = await this.getKey()
 
    const message = {
      role: "user",
      id: messageId,
      parentMessageId,
      text
    };
    lastSentMessageId = messageId
  
    await this._upsertMessage(message)
    const { messages, maxTokens, numTokens } = await this._buildMessages(
      text,
      opts,
    )

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    const body = {
      max_tokens: maxTokens,
      ...this._completionParams,
      messages,
      stream: false
    };
    return ({
      headers,
      body,
      numTokens,
    })
  }

  async setRes(response) {
    lastRespondMessageId = response.id
    this._upsertMessage({ ...response, parentMessageId: lastSentMessageId })
  }

  get apiKey() {
    return this._apiKey
  }

  set apiKey(apiKey) {
    this._apiKey = apiKey
  }

  async _buildMessages(text, opts) {
    const { systemMessage = this._systemMessage } = opts;
    let { parentMessageId } = opts;
    const userLabel = USER_LABEL_DEFAULT;
    const assistantLabel = ASSISTANT_LABEL_DEFAULT;
    const maxNumTokens = this._maxModelTokens - this._maxResponseTokens;
    let messages = [];
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    const systemMessageOffset = messages.length;
    let nextMessages = text ? messages.concat([
      {
        role: "user",
        content: text,
        name: opts.name
      }
    ]) : messages;
    let numTokens = 0;

    do {
      const prompt = nextMessages.reduce((prompt2, message) => {
        switch (message.role) {
          case "system":
            return prompt2.concat([`Instructions:
${message.content}`]);
          case "user":
            return prompt2.concat([`${userLabel}:
${message.content}`]);
          default:
            return prompt2.concat([`${assistantLabel}:
${message.content}`]);
        }
      }, []).join("\n\n");
      const nextNumTokensEstimate = await this._getTokenCount(prompt);
      const isValidPrompt = nextNumTokensEstimate <= maxNumTokens;
      if (prompt && !isValidPrompt) {
        break;
      }
      messages = nextMessages;
      numTokens = nextNumTokensEstimate;
      if (!isValidPrompt) {
        break;
      }
      if (!parentMessageId) {
        break;
      }
      const parentMessage = await this._getMessageById(parentMessageId);
      if (!parentMessage) {
        break;
      }
      const parentMessageRole = parentMessage.role || "user";
      nextMessages = nextMessages.slice(0, systemMessageOffset).concat([
        {
          role: parentMessageRole,
          content: parentMessage.text || parentMessage.content,
          name: parentMessage.name
        },
        ...nextMessages.slice(systemMessageOffset)
      ]);
      parentMessageId = parentMessage.parentMessageId;
    } while (true);
    const maxTokens = Math.max(
      1,
      Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens)
    );
    return { messages, maxTokens, numTokens };
  }

  async _getTokenCount(text) {
    text = text.replace(/<\|endoftext\|>/g, "")
    return encode(text).length;
  }

  async _defaultGetMessageById(id) {
    const res = await this._messageStore.get(id)
    return res;
  }

  async _defaultUpsertMessage(message) {
    await this._messageStore.set(message.id, message)
  }
}

export {
  ChatGPTAPI,
}
