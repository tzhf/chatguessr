import { getLocalStorage, setLocalStorage } from '../useLocalStorage'
;(function satelliteMode() {
  const settings = getLocalStorage('cg_satelliteMode__settings', {
    enabled: false,
    boundsLimit: 10
  })
// @ts-ignore
  window.toggleSatelliteMode = (el) => {
    settings.enabled = el.checked
    setLocalStorage('cg_satelliteMode__settings', settings)
  }
// @ts-ignore
  window.changeBoundsLimit = (el) => {
    if (!isNaN(Number(el.value))) {
      settings.boundsLimit = parseFloat(el.value)
      setLocalStorage('cg_satelliteMode__settings', settings)
      document.querySelector('#boundsLimitText')!.textContent = el.value + ' km'
    }
  }

  const classicGameGuiHTML = `
    <div class="section_sizeMedium__CuXRP">
      <div class="bars_root__tryg2 bars_center__kXp6T">
        <div class="bars_before__S32L5"></div>
        <span class="bars_content__Nw_TD"><h3>Satellite Mode settings</h3></span>
        <div class="bars_after__50_BW"></div>
      </div>
    </div>
    <div class="start-standard-game_settings__x94PU">
      <div style="display: flex; justify-content: space-between">
        <div style="display: flex; align-items: center">
            <span class="game-options_optionLabel__Vk5xN" style="margin: 0; padding-right: 6px">Enabled</span>
            <input
                type="checkbox"
                id="enableSatelliteMode"
                onclick="toggleSatelliteMode(this)"
                class="toggle_toggle__qfXpL"
            />
        </div>
        <div style="display: flex; align-items: center">
          <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
            <div class="game-options_optionLabel__Vk5xN">Limit</div>
            <input
              type="range"
              class="custom-slider"
              min="1"
              max="500"
              step="1"
              id="boundsLimit"
              oninput="changeBoundsLimit(this)"
            />
            <div class="game-options_optionLabel__Vk5xN" id="boundsLimitText"></div>
          </label>
        </div>
      </div>
    </div>
  `
  const checkInsertGui = () => {
    if (
      document.querySelector('[class^="radio-box_root__"]') &&
      document.querySelector('#enableSatelliteMode') === null
    ) {
      document
        .querySelector('[class^="section_sectionMedium__"]')
        ?.insertAdjacentHTML('beforeend', classicGameGuiHTML)

      if (settings.enabled) {
        ;(document.querySelector('#enableSatelliteMode') as HTMLInputElement).checked = true
      }

      ;(document.querySelector('#boundsLimit') as HTMLInputElement).value =
        settings.boundsLimit.toString()
      document.querySelector('#boundsLimitText')!.textContent = settings.boundsLimit + ' km'
    }
  }

  const observer = new MutationObserver(() => {
    checkInsertGui()
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true
  })
})()
