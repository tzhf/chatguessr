<template>
  <table>
    <thead>
      <tr>
        <th style="width: 35px">#</th>
        <th></th>
        <th style="width: 80px">{{ text }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(stat, i) of stats" :key="stat.player.userId">
        <td>
          <span v-if="i === 0" class="medal">🏆</span>
          <span v-else-if="i === 1" class="medal">🥈</span>
          <span v-else-if="i === 2" class="medal">🥉</span>
          <span v-else>{{ i + 1 }}</span>
        </td>
        <td>
          <div class="flex items-center gap-03">
            <span
              class="avatar"
              :style="{
                backgroundImage: `url(${stat.player.avatar ?? 'asset:avatar-default.jpg'})`
              }"
            ></span>
            <span class="username" :style="{ color: stat.player.color }">
              {{ stat.player.username }}
            </span>
            <span
              v-if="stat.player.flag"
              class="flag"
              :style="{
                backgroundImage: `url('flag:${stat.player.flag}')`
              }"
            ></span>
          </div>
        </td>
        <td>
          {{ stat.count }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{
  stats: Statistics['victories'] | Statistics['streaks'] | Statistics['perfects']
  text: string
}>()
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-weight: bold;
}
thead {
  top: 0;
  position: sticky;
  background-color: rgb(39, 39, 39);
  z-index: 2;
}
tr {
  height: 30px;
}
tbody tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.1);
}
tbody tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.2);
}
tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.3);
  transition: all 0.1s;
  transform: scale(1.01);
}
.medal {
  font-size: 18px;
}
</style>
