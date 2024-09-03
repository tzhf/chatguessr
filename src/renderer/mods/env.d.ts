import PostProcessingController, { PostProcessingState } from "./extenssr/post_processing_controller"

interface Window {
  toggleNoCarMode: (el: HTMLInputElement) => void
  toggleNoCompassMode: (el: HTMLInputElement) => void
  toggleGreyscale: (el: HTMLInputElement) => void	  
  toggleWaterMode: (el: HTMLInputElement) => void
  toggleScrambleMode: (el: HTMLInputElement) => void
  togglePixelateMode: (el: HTMLInputElement) => void
  toggleBlinkMode: (el: HTMLInputElement) => void
  changeBlinkTime: (el: HTMLInputElement) => void
  changeDelayTime: (el: HTMLInputElement) => void
  toggleSatelliteMode: (el: HTMLInputElement) => void
  changeBoundsLimit: (el: HTMLInputElement) => void
  toggleToonMode: (el: HTMLInputElement) => void
  toggleMinMode: (el: HTMLInputElement) => void
  toggleCrtMode: (el: HTMLInputElement) => void
  pp: PostProcessingState
  ppController: PostProcessingController | null
}
