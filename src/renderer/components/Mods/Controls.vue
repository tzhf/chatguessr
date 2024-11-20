<script setup lang="ts">
import SatelliteMode from './SatelliteMode.vue'
import BlinkMode from './BlinkMode.vue'
</script>

<template>
  <BlinkMode />
  <SatelliteMode />
</template>

<style>
label {
  text-align: center;
}
.section_sizeMedium h3 {
  color: var(--ds-color-white-60);
  font-size: var(--font-size-12);
  font-style: italic;
  font-weight: 700;
  line-height: var(--line-height-12);
  text-transform: uppercase;
}

.bars_root {
  --background: hsla(0, 0%, 100%, 0.5);
  align-items: center;
  display: flex;
}
.bars_center {
  justify-content: center;
  text-align: center;
}
.bars_after,
.bars_before {
  background: var(--background);
  flex: 1 1;
  height: 0.125rem;
  position: relative;
}
.bars_before {
  margin-right: 1rem;
}
.bars_after {
  margin-left: 1rem;
}
.bars_content {
  line-height: 1;
}

.game-options_optionLabel {
  color: var(--ds-color-white);
  font-size: var(--font-size-12);
  font-weight: 700;
  line-height: var(--line-height-12);
  min-height: var(--line-height-12);
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  white-space: nowrap;
}

.toggle_toggle {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background: var(--ds-color-white-10);
  border: 0;
  border-radius: 2rem;
  cursor: pointer;
  display: inline-block;
  height: 1.25rem;
  position: relative;
  transition: background-color 0.2s ease;
  width: 2.5rem;
}
.toggle_toggle:checked {
  background: var(--ds-color-purple-50);
}
.toggle_toggle:before {
  background: var(--ds-color-purple-50);
  content: '';
  height: 100%;
  left: 0;
  opacity: 0;
  position: absolute;
  top: 0;
  transition: opacity 0.3s ease;
  width: 100%;
}
.toggle_toggle:after {
  background: var(--ds-color-white);
  border-radius: 100%;
  content: '';
  height: 1rem;
  left: 0;
  margin: 0.125rem;
  opacity: 0.1;
  position: absolute;
  top: 0;
  transition:
    transform 0.1s ease,
    opacity 0.1s ease;
  width: 1rem;
}
.toggle_toggle:checked:after {
  opacity: 1;
  transform: translateX(125%);
}

.custom-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 0.5rem;
  border-radius: 0.625rem;
  background: #a19bd9;
  margin: 0.8rem 0;
  padding: 0;
  border: none;
  outline: none;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
}
.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  box-shadow: inset 0 0.0625rem 0 0 #a19bd9;
  appearance: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #7950e5;
  cursor: pointer;
}
.custom-slider::-moz-range-thumb {
  box-shadow: inset 0 0.0625rem 0 0 #a19bd9;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #7950e5;
  cursor: pointer;
}
.custom-slider.reverse {
  direction: rtl;
}
</style>
