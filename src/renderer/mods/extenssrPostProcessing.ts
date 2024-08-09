import PostProcessingController from './extenssr/post_processing_controller'
import { defaultPP } from './extenssr/post_processing_controller'
import { injectionStartup } from './extenssr/overrides'
const pp = defaultPP()
const ppController = new PostProcessingController()

window.pp = pp
window.ppController = ppController

injectionStartup(ppController)
