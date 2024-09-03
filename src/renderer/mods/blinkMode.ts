// Adapted from: https://greasyfork.org/en/scripts/438579-geoguessr-blink-mode
import { getLocalStorage, setLocalStorage } from '../useLocalStorage'
// @ts-ignore
;(function blinkMode() {
  const settings = getLocalStorage('cg_blinkMode__settings', {
    enabled: false,
    timeLimit: 0.8,
    roundDelay: 1
  })
// @ts-ignore
  window.toggleBlinkMode = (el) => {
    settings.enabled = el.checked
    setLocalStorage('cg_blinkMode__settings', settings)
    if (!el.checked) {
      try {
        showPanoramaCached()
      } catch {}
    }
  }
// @ts-ignore
  window.changeBlinkTime = (el) => {
    if (!isNaN(Number(el.value))) {
      settings.timeLimit = parseFloat(el.value)
      setLocalStorage('cg_blinkMode__settings', settings)
      document.getElementById('blinkTimeText')!.textContent = el.value + ' sec'
    }
  }
// @ts-ignore
  window.changeDelayTime = (el) => {
    if (!isNaN(Number(el.value))) {
      settings.roundDelay = parseFloat(el.value)
      setLocalStorage('cg_blinkMode__settings', settings)
      document.getElementById('delayTimeText')!.textContent = el.value + ' sec'
    }
  }

  const classicGameGuiHTML: string = `
    <div class="section_sizeMedium__CuXRP">
      <div class="bars_root__tryg2 bars_center__kXp6T">
        <div class="bars_before__S32L5"></div>
        <span class="bars_content__Nw_TD"><h3>Blink Mode settings</h3></span>
        <div class="bars_after__50_BW"></div>
      </div>
    </div>
    <div class="start-standard-game_settings__x94PU">
      <div class="game-options_optionGroup__qNKx1">
        <div style="display: flex; justify-content: space-between">
          <div style="display: flex; align-items: center">
            <span class="game-options_optionLabel__Vk5xN" style="margin: 0; padding-right: 6px">Enabled</span>
            <input type="checkbox" id="enableScript" onclick="toggleBlinkMode(this)" class="toggle_toggle__qfXpL" />
          </div>
          <div style="display: flex; align-items: center">
            <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
              <div class="game-options_optionLabel__Vk5xN">Time</div>
              <input
                type="range"
                class="custom-slider"
                min="0.1"
                max="5"
                step="0.1"
                id="blinkTime"
                oninput="changeBlinkTime(this)"
              />
              <div class="game-options_optionLabel__Vk5xN" id="blinkTimeText"></div>
            </label>
          </div>
          <div style="display: flex; align-items: center">
            <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
              <div class="game-options_optionLabel__Vk5xN">Round delay</div>
              <input
                type="range"
                class="custom-slider"
                min="0.1"
                max="5"
                step="0.1"
                id="delayTime"
                oninput="changeDelayTime(this)"
              />
              <div class="game-options_optionLabel__Vk5xN" id="delayTimeText"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  `

  const checkInsertGui = () => {
    if (
      document.querySelector('[class^="radio-box_root__"]') &&
      document.getElementById('enableScript') === null
    ) {
      document
        .querySelector('[class^="section_sectionMedium__"]')
        ?.insertAdjacentHTML('beforeend', classicGameGuiHTML)

      if (settings.enabled) {
        ;(document.getElementById('enableScript') as HTMLInputElement).checked = true
      }

      ;(document.getElementById('blinkTime') as HTMLInputElement).value =
        settings.timeLimit.toString()
      ;(document.getElementById('delayTime') as HTMLInputElement).value =
        settings.roundDelay.toString()
      document.getElementById('blinkTimeText')!.textContent = settings.timeLimit + ' sec'
      document.getElementById('delayTimeText')!.textContent = settings.roundDelay + ' sec'
    }
  }

  let mapRoot: HTMLElement | null = null
  function getMapRoot() {
    return document.querySelector('[data-qa=panorama]') as HTMLElement
  }

  function hidePanorama() {
    mapRoot = getMapRoot() || mapRoot
    hidePanoramaCached()
  }

  function hidePanoramaCached() {
    mapRoot!.style.filter = 'brightness(0%)'
  }

  function showPanorama() {
    mapRoot = getMapRoot() || mapRoot
    showPanoramaCached()
  }

  function showPanoramaCached() {
    mapRoot!.style.filter = 'brightness(100%)'
  }

  function isLoading() {
    return (
      document.querySelector('[class^="fullscreen-spinner_root__"]') ||
      !document.querySelector('.widget-scene-canvas')
    )
  }

  let wasBackdropThereOrLoading = false
  function isBackdropThereOrLoading() {
    return isLoading() || document.querySelector('[class^="result-layout_root__"]')
  }

  let showTimeoutID: NodeJS.Timeout
  let hideTimeoutID: NodeJS.Timeout
  function triggerBlink() {
    hidePanorama()
    clearTimeout(showTimeoutID)
    showTimeoutID = setTimeout(showPanorama, settings.roundDelay * 1000)
    clearTimeout(hideTimeoutID)
    hideTimeoutID = setTimeout(hidePanorama, (settings.timeLimit + settings.roundDelay) * 1000)
  }

  const observer = new MutationObserver(() => {
    checkInsertGui()

    if (settings.enabled) {
      if (isBackdropThereOrLoading()) {
        wasBackdropThereOrLoading = true
        if (!isLoading()) hidePanorama()
      } else if (wasBackdropThereOrLoading) {
        wasBackdropThereOrLoading = false
        triggerBlink()
      }
    }
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true
  })
})()
