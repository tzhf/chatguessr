<template>
  <div class="container">
    <div class="flex items-center justify-center gap-05 mb-05">
      <IconCup />
      <h1>LEADERBOARD</h1>
      <IconCup />
    </div>

    <Tabs class="mb-1" :tabs :current-tab @change="(tab) => (currentTab = tab)" />
    <Timeframe v-show="currentTab === 'day'" :stats="dailyStats" />
    <Timeframe v-show="currentTab === 'week'" :stats="weeklyStats" />
    <Timeframe v-show="currentTab === 'month'" :stats="monthlyStats" />
    <Timeframe v-show="currentTab === 'year'" :stats="yearlyStats" />
    <Timeframe v-show="currentTab === 'all'" :stats="allTimeStats" />

    <div>
      <a
        :class="[
          'my-2',
          clearStats.state === 'confirm'
            ? 'warning'
            : clearStats.state === 'success'
              ? 'primary'
              : 'danger'
        ]"
        @click="handleClearStatsClick(currentTab)"
      >
        {{ clearStats.text }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, reactive, watch, computed } from 'vue'
import { getLocalStorage, setLocalStorage } from '@/useLocalStorage'
import Tabs from '../ui/Tabs.vue'
import Timeframe from './Timeframe.vue'
import IconCup from '@/assets/icons/winner_cup.svg'

const { chatguessrApi } = window

const currentTab = shallowRef<StatisticsInterval>(
  getLocalStorage('cg_leaderboard__currentTab', 'all')
)
watch(currentTab, () => {
  setLocalStorage('cg_leaderboard__currentTab', currentTab.value)
})

const tabs = shallowRef<{ name: StatisticsInterval; value: string }[]>([
  { name: 'day', value: 'Today' },
  { name: 'week', value: 'This week' },
  { name: 'month', value: 'This month' },
  { name: 'year', value: 'This year' },
  { name: 'all', value: 'All time' }
])

const dailyStats = shallowRef<Statistics>(await chatguessrApi.getGlobalStats('day'))
const weeklyStats = shallowRef<Statistics>(await chatguessrApi.getGlobalStats('week'))
const monthlyStats = shallowRef<Statistics>(await chatguessrApi.getGlobalStats('month'))
const yearlyStats = shallowRef<Statistics>(await chatguessrApi.getGlobalStats('year'))
const allTimeStats = shallowRef<Statistics>(await chatguessrApi.getGlobalStats('all'))

const clearStats = reactive({
  state: 'default',
  text: computed(() =>
    clearStats.state === 'confirm'
      ? '⚠️ Are you sure ?'
      : clearStats.state === 'pending'
        ? '⏳ Pending'
        : clearStats.state === 'success'
          ? '✔️ Stats cleared'
          : clearStats.state === 'failed'
            ? '❌ Failed to clear stats'
            : `🗑️ Clear ${currentTab.value} stats`
  )
})

const handleClearStatsClick = async (sinceTime: StatisticsInterval) => {
  if (clearStats.state === 'default') {
    clearStats.state = 'confirm'
    setTimeout(() => {
      if (clearStats.state !== 'confirm') return
      clearStats.state = 'default'
    }, 3000)
  } else if (clearStats.state === 'confirm') {
    clearStats.state = 'pending'
    const success = await chatguessrApi.clearGlobalStats(sinceTime)
    if (success) {
      dailyStats.value = await chatguessrApi.getGlobalStats('day')
      weeklyStats.value = await chatguessrApi.getGlobalStats('week')
      monthlyStats.value = await chatguessrApi.getGlobalStats('month')
      yearlyStats.value = await chatguessrApi.getGlobalStats('year')
      allTimeStats.value = await chatguessrApi.getGlobalStats('all')
      clearStats.state = 'success'
    } else {
      clearStats.state = 'failed'
    }
    setTimeout(() => {
      clearStats.state = 'default'
    }, 3000)
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  width: 80vw;
  height: 84vh;
  text-align: center;
  padding: 0.5rem 1rem;
}
h1 {
  font-weight: 400;
}
a:hover {
  font-weight: bold;
}
</style>
