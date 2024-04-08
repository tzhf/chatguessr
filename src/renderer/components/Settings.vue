<template>
  <div class="modal-mask">
    <div class="modal-wrapper">
      <div class="modal-container">
        <div class="tab">
          <button :class="{ active: currentTab === 1 }" @click="currentTab = 1">SETTINGS</button>
          <button :class="{ active: currentTab === 2 }" @click="currentTab = 2">
            TWITCH CONNECT
          </button>
          <button :class="{ active: currentTab === 3 }" @click="currentTab = 3">BAN LIST</button>
          <button class="btn close bg-danger" @click="emit('close')"></button>
        </div>

        <div v-show="currentTab === 1" class="modal-content">
          <h2>Game Settings</h2>
          <div class="ml-05">
            <label
              class="form__group"
              data-tip="Players can change their guess. Streaks, scores & distances won't be displayed on the scoreboard"
            >
              Allow guess changing
              <input v-model="settings.isMultiGuess" type="checkbox" />
            </label>
            <label
              class="form__group"
              data-tip="Drawing too much guess markers on the map may affect performance (default: 30)"
            >
              Guess markers limit ({{ settings.guessMarkersLimit }}) :
              <input
                v-model.number="settings.guessMarkersLimit"
                type="range"
                min="10"
                step="5"
                max="100"
              />
            </label>
          </div>
          <hr />

          <h2>Twitch notifications</h2>
          <div class="ml-05">
            <label class="form__group" data-tip="Display &lt;User&gt; has guessed">
              <i>&lt;User&gt; has guessed</i>
              <input v-model="settings!.showHasGuessed" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; has already guessed">
              <i>&lt;User&gt; has already guessed</i>
              <input v-model="settings.showHasAlreadyGuessed" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; guess changed">
              <i>&lt;User&gt; guess changed</i>
              <input v-model="settings.showGuessChanged" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; submitted previous guess">
              <i>&lt;User&gt; submitted previous guess</i>
              <input v-model="settings.showSubmittedPreviousGuess" type="checkbox" />
            </label>
          </div>
          <hr />

          <h2>Twitch commands <small>(leave empty to disable)</small></h2>
          <div class="ml-05">
            <div class="grid-col">
              <div>
                <label class="form__group" data-tip="Get ChatGuessr map link (default: !cg)">
                  Get ChatGuessr map :
                  <input v-model.trim="settings.cgCmd" type="text" spellcheck="false" />
                </label>
                <textarea v-model="settings.cgMsg" spellcheck="false" rows="3"></textarea>
                <label class="form__group" data-tip="ChatGuessr map cooldown (default: 30)">
                  ChatGuessr map cooldown ({{ settings.cgCmdCooldown }} sec) :
                  <input
                    v-model.number="settings.cgCmdCooldown"
                    type="range"
                    min="0"
                    step="5"
                    max="120"
                  />
                </label>
              </div>

              <div>
                <label class="form__group" data-tip="Get user stats in chat  (default: !me)">
                  Get user stats :
                  <input v-model.trim="settings.getUserStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Clear user stats (default: !clear)">
                  Clear user stats :
                  <input v-model.trim="settings.clearUserStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Get channel best stats (default: !best)">
                  Get channel best stats :
                  <input v-model.trim="settings.getBestStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Get flags list  (default: !flags)">
                  Get flags list :
                  <input v-model.trim="settings.flagsCmd" type="text" spellcheck="false" />
                </label>
                <label
                  class="form__group"
                  data-tip="Guess random coordinates (default: !randomplonk)"
                >
                  Random plonk :
                  <input v-model.trim="settings.randomPlonkCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Get current map description (default: !map)">
                  Get current map description :
                  <input v-model.trim="settings.mapCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Map description cooldown  (default: 30)">
                  Map description cooldown ({{ settings.mapCmdCooldown }} sec) :
                  <input
                    v-model.number="settings.mapCmdCooldown"
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
          <div class="flex flex-col gap-05 mt-1">
            <small>ChatGuessr version {{ currentVerion }}</small>
            <button
              type="button"
              :class="[
                'btn',
                clearStatsBtn.state === 1
                  ? 'bg-warning'
                  : clearStatsBtn.state === 2
                    ? 'bg-primary'
                    : 'bg-danger'
              ]"
              @click="clearStats()"
            >
              {{ clearStatsBtn.text }}
            </button>
          </div>
        </div>

        <div v-show="currentTab === 2" class="modal-content">
          <div class="flex flex-col flex-center gap-1 mx-1">
            <IconTwitch />
            <span :class="[twitchConnectionState.state]"
              >{{
                twitchConnectionState.state === 'connected'
                  ? 'connected as ' + twitchConnectionState.botUsername
                  : twitchConnectionState.state === 'error'
                    ? 'Error: ' + twitchConnectionState.error
                    : twitchConnectionState.state
              }}
            </span>
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
            <div class="form__group" data-tip="Your streamer account">
              Your streaming channel :

              <div class="flex gap-02">
                <input
                  v-model="newChannelName"
                  type="text"
                  style="width: 240px"
                  spellcheck="false"
                  required
                />
                <button
                  :disabled="newChannelName === settings.channelName"
                  class="btn bg-primary"
                  style="width: 90px"
                  @click="onChannelNameUpdate()"
                >
                  Update
                </button>
              </div>
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
                <button class="btn bg-primary" style="width: 90px" @click="copy(cgLink)">
                  {{ copied ? 'Copied ✔️' : ' Copy 🖊️' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="currentTab === 3" class="modal-content">
          <h3>Banned users :</h3>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import IconTwitch from '@/assets/icons/twitch.svg'
const { copy, copied } = useClipboard()

const { chatguessrApi } = window
const { socketConnectionState, twitchConnectionState } = defineProps<{
  twitchConnectionState: TwitchConnectionState
  socketConnectionState: SocketConnectionState
}>()

const currentTab = ref(twitchConnectionState.state === 'disconnected' ? 2 : 1)

const settings = reactive<Settings>(await chatguessrApi.getSettings())
watch(settings, () => {
  chatguessrApi.saveSettings({ ...settings })
})

const newChannelName = ref(settings.channelName)
const onChannelNameUpdate = () => {
  settings.channelName = newChannelName.value
  chatguessrApi.reconnect()
}

const cgLink = ref(
  twitchConnectionState.state === 'connected'
    ? `chatguessr.com/map/${twitchConnectionState.botUsername}`
    : ''
)

const bannedUsers = reactive<{ username: string }[]>(await chatguessrApi.getBannedUsers())
const newBannedUser = ref('')
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

const clearStatsBtn = reactive({ state: 0, text: '🗑️ Clear user stats' })
const clearStats = () => {
  if (clearStatsBtn.state === 2) return
  if (clearStatsBtn.state === 0) {
    clearStatsBtn.state = 1
    clearStatsBtn.text = '⚠️ Are you sure ?'
    reset(3000)
  } else {
    chatguessrApi.clearStats()
    clearStatsBtn.state = 2
    clearStatsBtn.text = '✔️ All stats cleared'
    reset(2000)
  }

  function reset(timeOut: number) {
    setTimeout(() => {
      clearStatsBtn.state = 0
      clearStatsBtn.text = '🗑️ Clear user stats'
    }, timeOut)
  }
}

const currentVerion = ref(await chatguessrApi.getCurrentVersion())

const emit = defineEmits(['close'])
</script>
<style scoped>
textarea {
  min-height: 85px;
}
.modal-mask {
  position: fixed;
  display: table;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg-dark-transparent);
  transition: opacity 0.3s ease;
  z-index: 99999;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  font-family: Montserrat;
  font-size: 13px;
  font-weight: 700;
  color: white;
  width: 870px;
  min-height: 610px;
  margin: 0 auto;
  border-radius: 5px;
  background-color: var(--bg-dark-transparent);
  border: 1px solid #a5a5a542;
  box-shadow: 0 2px 8px #000c;
  transition: all 0.3s ease;
  user-select: none;
  overflow: hidden;
}

.modal-content {
  padding: 0.5rem 1rem;
}

.grid-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 1rem;
}

.tab {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 40px;
}

.tab button {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 2px;
  color: #fff;
  transition: 0.3s;
  cursor: pointer;
}

.tab button:not(:last-child) {
  background-color: rgb(58, 58, 58);
  border-right: solid 1px rgb(0, 0, 0);
}

.tab button:hover:not(:last-child),
.tab button.active {
  color: #000;
  background: var(--primary);
}

.close:after {
  font-size: 23px;
  display: inline-block;
  content: '\00d7';
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
  right: 4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid rgb(127 127 127);
}
[data-tip]:after {
  content: attr(data-tip);
  top: 30px;
  right: 0;
  padding: 0.7rem 1rem;
  text-align: center;
  color: #ffffff;
  background: rgb(127 127 127);
  border-radius: 4px;
}
[data-tip]:hover:after,
[data-tip]:hover:before {
  display: block;
}

.settings_modal-enter-from,
.settings_modal-leave-to {
  opacity: 0;
}
.settings_modal-enter-active .modal-container,
.settings_modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
