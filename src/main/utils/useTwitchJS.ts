import { EventEmitter } from 'events'
import { Client } from 'tmi.js'

export default class TwitchBackend extends EventEmitter {
  #tmi: Client

  #closing = false

  botUsername: string

  channelName: string

  constructor(options: { botUsername: string; channelName: string; whisperToken: string }) {
    super()

    this.botUsername = options.botUsername
    this.channelName = options.channelName

    this.#tmi = new Client({
      options: { debug: true, messagesLogLevel: 'info' },
      connection: {
        secure: true,
        reconnect: false
      },
      identity: {
        username: this.botUsername,
        password: `oauth:${options.whisperToken}`
      },
      channels: [this.channelName]
    })

    this.#tmi.on('connected', () => {
      this.emit('connected')
    })

    this.#tmi.on('disconnected', () => {
      this.emit('disconnected', this.#closing)
    })

    this.#tmi.on('whisper', (_from, userstate, message, self) => {
      if (self) return
      this.emit('guess', userstate, message)
    })

    this.#tmi.on('message', (_channel, userstate, message, self) => {
      if (self) return
      this.emit('message', userstate, message)
    })
  }

  async connect() {
    await this.#tmi.connect()
  }

  async close() {
    this.#closing = true
    await this.#tmi.disconnect()
  }

  isConnected() {
    return this.#tmi.readyState() === 'OPEN'
  }

  async sendMessage(message: string, options: { system?: boolean } = {}) {
    if (options.system) {
      await this.#tmi.action(this.channelName, message)
    } else {
      await this.#tmi.say(this.channelName, message)
    }
  }
}
