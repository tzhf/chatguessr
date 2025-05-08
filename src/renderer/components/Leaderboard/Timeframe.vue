<template>
  <div class="content mb-03">
    <div class="flex-1 relative mb-03">
      <h2>VICTORIES</h2>
      <div class="table-container">
        <Table :stats="stats.victories" text="Victories" />
      </div>
    </div>
    <div class="flex flex-1 relative gap-05 h-full">
      <div class="relative w-full">
        <h2>STREAKS</h2>
        <div class="table-container">
          <Table :stats="stats.streaks" text="Streak" />
        </div>
      </div>
      <div class="relative w-full">
        <h2>5Ks</h2>
        <div class="table-container">
          <Table :stats="stats.perfects" text="Perfects" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Table from './Table.vue'
defineProps<{ stats: Statistics }>()
</script>

<style scoped>
h2 {
  margin: 0;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}
.table-container {
  position: absolute;
  top: 27px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  border-radius: 9px;
  overflow-x: hidden;
  background-color: var(--bg-dark-transparent);
  border: 1px solid rgb(255, 255, 255, 0.15);
  scrollbar-color: #bbbbbb transparent;
  scrollbar-width: thin;
}
</style>
