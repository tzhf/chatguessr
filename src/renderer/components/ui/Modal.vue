<template>
  <transition name="modal">
    <div v-if="isVisible" class="modal-wrapper">
      <div ref="target" class="modal-container">
        <slot />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

const { isVisible } = defineProps<{
  isVisible: boolean
}>()

const target = ref()
const emit = defineEmits(['close'])
onClickOutside(target, () => emit('close'))
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99;
  cursor: pointer;
}

.modal-container {
  font-family: Montserrat;
  font-size: 13px;
  color: white;
  border-radius: 5px;
  background-color: rgba(51, 51, 51, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgb(99, 99, 99);
  box-shadow: 0 2px 8px #000c;
  transition: all 0.3s ease;
  user-select: none;
  overflow: hidden;
  cursor: auto;
}

/* MODAL ANIMATION */
.modal-enter-active {
  animation: bounce-in 0.3s;
}
.modal-leave-active {
  animation: bounce-in 0.3s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale3d(0, 0, 0);
  }
  50% {
    transform: scale3d(1.1, 1.1, 1.1);
  }
  100% {
    transform: scale3d(1, 1, 1);
  }
}
</style>
