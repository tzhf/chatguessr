<template>
  <div class="container">
    <Tabs :tabs :current-tab @change="(tab) => (currentTab = tab)" />

    <div v-show="currentTab === 'game-settings'" class="content">
      <h2>Game Settings</h2>
      <div class="ml-05">
        <div class="form__group">
          <label
            data-tip="Players can change their guess. Streaks, scores & distances won't be displayed on the scoreboard"
          >
            <input v-model="settings.isMultiGuess" type="checkbox" />
            Allow guess changing
          </label>
        </div>

        <div class="form__group">
          <label data-tip="Exclude streamer stats from leaderboard and !best command">
            <input v-model="settings.excludeBroadcasterData" type="checkbox" />
            Exclude streamer from stats
          </label>
        </div>

        <div class="form__group">
          <label
            data-tip="The button is shown on the right menu during games. Clicking the button will end the round and make a random guess for the streamer"
          >
            <input
              v-model="settings.showStreamerRandomPlonkButton"
              type="checkbox"
              @change="
                (e) => {
                  const target = e.target as HTMLInputElement | null
                  if (target) {
                    setShowRandomPlonkButton(target.checked)
                  }
                }
              "
            />
            Show streamer random plonk button during rounds
          </label>
        </div>

        <div class="form__group">
          <label
            data-tip="Drawing too much guess markers on the map may affect performance (default: 50)"
          >
            Guess markers limit ({{ settings.guessMarkersLimit }})
          </label>
          <input
            v-model.number="settings.guessMarkersLimit"
            type="range"
            min="10"
            step="5"
            max="99"
          />
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'chat-commands'" class="content">
      <h2>Chat commands <small style="color: darkgray">(leave empty to disable)</small></h2>
      <div class="ml-05">
        <div class="grid-col">
          <div>
            <label class="form__group">
              Get ChatGuessr map :
              <input
                v-model.trim="settings.commands.getChatguessrMap.command"
                placeholder="!cg"
                type="text"
                spellcheck="false"
              />
            </label>
            <textarea
              v-model="settings.commands.getChatguessrMap.message"
              spellcheck="false"
              rows="3"
            ></textarea>
            <label class="form__group">
              ChatGuessr map cooldown ({{ settings.commands.getChatguessrMap.cooldown }} sec) :
              <input
                v-model.number="settings.commands.getChatguessrMap.cooldown"
                type="range"
                min="0"
                step="5"
                max="120"
              />
            </label>
          </div>

          <div>
            <label class="form__group">
              Get user stats :
              <input
                v-model.trim="settings.commands.getUserStats.command"
                placeholder="!me"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Clear user stats :
              <input
                v-model.trim="settings.commands.clearUserStats.command"
                placeholder="!clear"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Get channel best stats :
              <input
                v-model.trim="settings.commands.getBestStats.command"
                placeholder="!best"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Get flags list :
              <input
                v-model.trim="settings.commands.getFlagsLink.command"
                placeholder="!flags"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Random plonk :
              <input
                v-model.trim="settings.commands.randomPlonk.command"
                placeholder="!randomplonk"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Get the last location :
              <input
                v-model.trim="settings.commands.getLastLoc.command"
                placeholder="!lastloc"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Get current map description :
              <input
                v-model.trim="settings.commands.getGeoguessrMap.command"
                placeholder="!map"
                type="text"
                spellcheck="false"
              />
            </label>
            <label class="form__group">
              Map description cooldown ({{ settings.commands.getGeoguessrMap.cooldown }} sec) :
              <input
                v-model.number="settings.commands.getGeoguessrMap.cooldown"
                type="range"
                min="0"
                step="5"
                max="120"
              />
            </label>
          </div>
        </div>
      </div>
      <hr />
      <h2>Chat notifications</h2>
      <div class="ml-05">
        <div class="form__group">
          <label>
            <input v-model="settings.notifications.seedStarted.enabled" type="checkbox" />
            Seed started
          </label>
          <input
            v-model="settings.notifications.seedStarted.message"
            class="full"
            type="text"
            placeholder="🌎 A new seed of <map> has started."
            :disabled="!settings.notifications.seedStarted.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.roundStarted.enabled" type="checkbox" />
            Round started
          </label>
          <input
            v-model="settings.notifications.roundStarted.message"
            class="full"
            type="text"
            placeholder="🌎 Round <round> has started."
            :disabled="!settings.notifications.roundStarted.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.guessesAreOpen.enabled" type="checkbox" />
            Guesses are open
          </label>
          <input
            v-model="settings.notifications.guessesAreOpen.message"
            class="full"
            type="text"
            placeholder="Guesses are open..."
            :disabled="!settings.notifications.guessesAreOpen.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.guessesAreClosed.enabled" type="checkbox" />
            Guesses are closed
          </label>
          <input
            v-model="settings.notifications.guessesAreClosed.message"
            class="full"
            type="text"
            placeholder="Guesses are closed..."
            :disabled="!settings.notifications.guessesAreClosed.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.roundFinished.enabled" type="checkbox" />
            Round finished
          </label>
          <input
            v-model="settings.notifications.roundFinished.message"
            class="full"
            type="text"
            placeholder="🌎 Round <round> has finished. Congrats <flag> <username> !"
            :disabled="!settings.notifications.roundFinished.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.gameFinished.enabled" type="checkbox" />
            Game finished
          </label>
          <input
            v-model="settings.notifications.gameFinished.message"
            class="full"
            type="text"
            placeholder="🌎 Game finished. Congrats <flag> <username> ! 🏆 Game Summary: <link>"
            :disabled="!settings.notifications.gameFinished.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.hasGuessed.enabled" type="checkbox" />
            &lt;User&gt; has guessed
          </label>
          <input
            v-model="settings.notifications.hasGuessed.message"
            class="full"
            type="text"
            placeholder="<flag> <username> has guessed !"
            :disabled="!settings.notifications.hasGuessed.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.alreadyGuessed.enabled" type="checkbox" />
            &lt;User&gt; has already guessed
          </label>
          <input
            v-model="settings.notifications.alreadyGuessed.message"
            class="full"
            type="text"
            placeholder="<username> you already guessed"
            :disabled="!settings.notifications.alreadyGuessed.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input v-model="settings.notifications.guessChanged.enabled" type="checkbox" />
            &lt;User&gt; guess changed
          </label>
          <input
            v-model="settings.notifications.guessChanged.message"
            class="full"
            type="text"
            placeholder="<flag> <username> guess changed"
            :disabled="!settings.notifications.guessChanged.enabled"
            spellcheck="false"
          />
        </div>

        <div class="form__group">
          <label>
            <input
              v-model="settings.notifications.submittedPreviousGuess.enabled"
              type="checkbox"
            />
            &lt;User&gt; submitted previous guess
          </label>
          <input
            v-model="settings.notifications.submittedPreviousGuess.message"
            class="full"
            type="text"
            placeholder="<username> you submitted your previous guess"
            :disabled="!settings.notifications.submittedPreviousGuess.enabled"
            spellcheck="false"
          />
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'twitch-connect'" class="content">
      <div class="flex flex-col items-center justify-center gap-02 my-1">
        <IconTwitch class="mb-1" />
        <div class="form__group">
          <button
            :class="['btn', twitchConnectionState.state]"
            @click="chatguessrApi.replaceSession()"
          >
            {{
              twitchConnectionState.state === 'disconnected'
                ? 'Login'
                : twitchConnectionState.state === 'connecting'
                  ? 'Connecting...'
                  : 'Change account'
            }}
          </button>
        </div>
        <div class="form__group">
          Your bot account :
          <span :class="[twitchConnectionState.state]"
            >{{
              twitchConnectionState.state === 'connected'
                ? 'connected as ' + twitchConnectionState.botUsername
                : twitchConnectionState.state === 'error'
                  ? 'Error: ' + twitchConnectionState.error
                  : twitchConnectionState.state
            }}
          </span>
        </div>

        <div class="form__group">
          Your streaming channel :
          <div class="flex gap-02">
            <input v-model="newChannelName" type="text" spellcheck="false" required />
            <button
              :disabled="newChannelName === settings.channelName"
              class="btn bg-primary"
              @click="onChannelNameUpdate()"
            >
              Update
            </button>
          </div>
        </div>
      </div>
      <h2>Status :</h2>
      <div class="ml-05">
        <div class="form__group">
          Twitch :<span :class="[twitchConnectionState.state]">{{
            twitchConnectionState.state
          }}</span>
        </div>
        <div class="form__group">
          ChatGuessr server :<span :class="[socketConnectionState.state]"
            >{{ socketConnectionState.state }}
            <button
              v-if="socketConnectionState.state === 'connecting'"
              :class="['btn', socketConnectionState.state]"
              @click="chatguessrApi.reconnect()"
            >
              ⟳
            </button>
          </span>
        </div>
        <div class="form__group">
          Your cg link :
          <div class="flex gap-02">
            <input
              :value="
                twitchConnectionState.state === 'connected'
                  ? `chatguessr.com/map/${twitchConnectionState.botUsername}`
                  : ''
              "
              type="text"
              style="width: 240px"
              disabled
            />
            <button class="btn bg-primary" style="width: 85px" @click="copy(cgLink)">
              {{ copied ? '✔️ Copied' : '🖊️ Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'ban-list'" class="content">
      <h2>Ban List</h2>
      <div class="form__group">
        <div class="flex gap-03">
          <input
            v-model.trim="newBannedUser"
            type="text"
            spellcheck="false"
            @keyup.enter="addBannedUser()"
          />
          <button type="button" class="btn bg-danger" @click="addBannedUser()">Ban User</button>
        </div>
      </div>

      <div class="flex flex-wrap gap-03 mb-1">
        <span
          v-for="(user, index) of bannedUsers"
          :key="index"
          class="badge bg-danger"
          title="Unban user"
          @click="removeBannedUser(index, user)"
          >{{ user.username }}</span
        >
      </div>
    </div>

    <div class="footer">
      <hr />
      <small>ChatGuessr version {{ currentVerion }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, shallowReactive, reactive, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import Tabs from './ui/Tabs.vue'
import IconTwitch from '@/assets/icons/twitch.svg'

const { chatguessrApi } = window
const { copy, copied } = useClipboard()

const { socketConnectionState, twitchConnectionState, setShowRandomPlonkButton } = defineProps<{
  twitchConnectionState: TwitchConnectionState
  socketConnectionState: SocketConnectionState
  setShowRandomPlonkButton: (showButton: boolean) => void
}>()

const currentTab = shallowRef(
  twitchConnectionState.state === 'disconnected' ? 'twitch-connect' : 'game-settings'
)
const tabs = shallowRef([
  { name: 'game-settings', value: 'Game Settings' },
  { name: 'chat-commands', value: 'Chat Commands & Notifications' },
  { name: 'twitch-connect', value: 'Twitch Connect' },
  { name: 'ban-list', value: 'Ban List' }
])

const settings = reactive<Settings>(await chatguessrApi.getSettings())
watch(settings, () => {
  chatguessrApi.saveSettings(JSON.parse(JSON.stringify(settings)))
})

const newChannelName = shallowRef(settings.channelName)
const onChannelNameUpdate = () => {
  settings.channelName = newChannelName.value
  chatguessrApi.reconnect()
}

const cgLink = shallowRef(
  twitchConnectionState.state === 'connected'
    ? `chatguessr.com/map/${twitchConnectionState.botUsername}`
    : ''
)

const bannedUsers = shallowReactive<{ username: string }[]>(await chatguessrApi.getBannedUsers())
const newBannedUser = shallowRef('')
const addBannedUser = () => {
  if (!newBannedUser.value) return
  bannedUsers.push({ username: newBannedUser.value })
  chatguessrApi.addBannedUser(newBannedUser.value)
  newBannedUser.value = ''
}

const removeBannedUser = (index: number, user: { username: string }) => {
  chatguessrApi.deleteBannedUser(user.username)
  bannedUsers.splice(index, 1)
}

const currentVerion = shallowRef(await chatguessrApi.getCurrentVersion())
</script>

<style scoped>
textarea {
  min-height: 85px;
}
h2 small {
  font-size: 0.8rem;
}

.container {
  width: 870px;
  min-height: 700px;
}

.content {
  padding: 0.5rem 1rem;
}

.grid-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 1rem;
}

.btn.connected {
  background: var(--primary);
}
span.connected {
  color: var(--primary);
}

.btn.connecting {
  background: var(--warning);
}
span.connecting {
  color: var(--warning);
}

.btn.disconnected,
.btn.error {
  background: var(--danger);
}

span.disconnected,
span.error {
  color: var(--danger);
}

.badge {
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  box-shadow: 1px 0 4px #00000073;
}

[data-tip] {
  position: relative;
}
[data-tip]:before,
[data-tip]:after {
  display: none;
  position: absolute;
  z-index: 1;
}
[data-tip]:before {
  content: '';
  top: 22px;
  left: 4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid rgba(0, 0, 0, 0.8);
}
[data-tip]:after {
  content: attr(data-tip);
  top: 30px;
  left: 0;
  padding: 0.7rem 1rem;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
}
[data-tip]:hover:after,
[data-tip]:hover:before {
  display: block;
}
.footer {
  position: absolute;
  width: 100%;
  left: 0;
  bottom: 0;
  margin: 0.5rem 0 0.5rem 0;
  text-align: center;
}
</style>
