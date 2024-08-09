import PostProcessingController, {
  PostProcessingState
} from './extenssr/post_processing_controller'

declare global {
  interface Window {
    pp: PostProcessingState
    ppController: PostProcessingController | null
  }
}
