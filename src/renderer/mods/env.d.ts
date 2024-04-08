interface Window {
  toggleNoCarMode: (el: HTMLInputElement) => void
  toggleNoCompassMode: (el: HTMLInputElement) => void
  toggleBlinkMode: (el: HTMLInputElement) => void
  changeBlinkTime: (el: HTMLInputElement) => void
  changeDelayTime: (el: HTMLInputElement) => void
  toggleSatelliteMode: (el: HTMLInputElement) => void
  changeBoundsLimit: (el: HTMLInputElement) => void
}
