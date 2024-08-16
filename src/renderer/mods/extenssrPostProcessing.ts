import PostProcessingController from "./extenssr/post_processing_controller"
import { defaultPP } from "./extenssr/post_processing_controller"
import { injectionStartup } from "./extenssr/overrides"
const pp = defaultPP()
const ppController = new PostProcessingController()
// @ts-ignore
window.pp = pp
// @ts-ignore
window.ppController = ppController
injectionStartup(ppController)
