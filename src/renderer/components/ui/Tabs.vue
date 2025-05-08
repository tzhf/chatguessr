<template>
  <div class="tab">
    <button
      v-for="tab of tabs"
      :key="tab.name"
      :class="{ active: currentTab === tab.name }"
      @click="$emit('change', tab.name)"
    >
      {{ tab.value }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { tabs, currentTab } = defineProps<{
  tabs: { name: string; value: string }[]
  currentTab: string
}>()

defineEmits(['change'])
</script>

<style scoped>
.tab {
  display: flex;
  height: 30px;
  border-radius: 5px;
  overflow: hidden;
}

.tab button {
  flex-grow: 1;
  font-size: 12px;
  letter-spacing: 1px;
  color: #fff;
  transition: 0.2s;
  cursor: pointer;
}

.tab button {
  background-color: var(--bg-dark-transparent);
}
.tab button:not(:last-child) {
  border-right: solid 1px rgb(129 129 129);
}

.tab button:hover,
.tab button.active {
  color: #000;
  background: var(--primary);
}
</style>
