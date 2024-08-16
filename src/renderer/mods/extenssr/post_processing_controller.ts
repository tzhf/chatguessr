import type { PostprocessHandler } from './postprocess_handler';
import { CombinePasses, ShaderPass, type ShaderInfo } from './shader_pass';
import bloomString from './shaders/bloom.glsl?raw';
import crtString from './shaders/crt.glsl?raw';
import drunkString from './shaders/drunk.glsl?raw';
import fisheyeString from './shaders/fisheye.glsl?raw';
import pixelateString from './shaders/pixelate.glsl?raw';
import toonString from './shaders/toon.glsl?raw';
import minString from './shaders/min.glsl?raw';
import motionString from './shaders/motion_blur.glsl?raw';
import scrambleString from './shaders/scramble.glsl?raw';
import snowString from './shaders/snow.glsl?raw';
import sobelString from './shaders/sobel.glsl?raw';
import vignetteString from './shaders/vignette.glsl?raw';
import waterString from './shaders/water.glsl?raw';
import { UniformType, type Uniform } from './uniform';

const mutuallyExclusiveShaderToggles = [
	'crt',
	'drunk',
	'fisheye',
	'pixelate',
	'min',
	'motion_blur',
	'scramble',
	'water'
] as const;
const regularShaderToggles = ['bloom', 'toon', 'snow', 'sobel', 'vignette'] as const;
const shaderToggles = [...mutuallyExclusiveShaderToggles, ...regularShaderToggles] as const;
const nonShaderToggles = ['hideCar'] as const;

const toggles = [...shaderToggles, ...nonShaderToggles] as const;
const sliders = ['pixelScale', 'toonScale'] as const;

type MutuallyExclusiveToggleTypes = (typeof mutuallyExclusiveShaderToggles)[number];
type ToggleTypes = (typeof toggles)[number];
type ShaderToggleTypes = (typeof shaderToggles)[number];
type SliderTypes = (typeof sliders)[number];
export type PostProcessingState = {
	[key in ToggleTypes]: boolean;
} & {
	[key in SliderTypes]: number;
} & {
	scrambleState: number[];
};

type Effect = {
	shaderPass: ShaderPass;
	updateKnownUniforms?: (state: PostProcessingState, knownUniforms: Map<string, Uniform>) => void;
};

const effects: Record<ShaderToggleTypes, Effect> = {
	bloom: {
		shaderPass: ShaderPass.fromString(bloomString) as ShaderPass
	},
	crt: {
		shaderPass: ShaderPass.fromString(crtString) as ShaderPass
	},
	drunk: {
		shaderPass: ShaderPass.fromString(drunkString) as ShaderPass
	},
	fisheye: {
		shaderPass: ShaderPass.fromString(fisheyeString) as ShaderPass
	},
	pixelate: {
		shaderPass: ShaderPass.fromString(pixelateString) as ShaderPass,
		updateKnownUniforms: (state, knownUniforms) => {
			knownUniforms.set('scaling', {
				name: 'scaling',
				type: UniformType.FLOAT,
				value: [state.pixelScale]
			});
		}
	},
	toon: {
		shaderPass: ShaderPass.fromString(toonString) as ShaderPass,
		updateKnownUniforms: (state, knownUniforms) => {
			knownUniforms.set('toonScale', {
				name: 'toonScale',
				type: UniformType.FLOAT,
				value: [state.toonScale]
			});
		}
	},
	min: {
		shaderPass: ShaderPass.fromString(minString) as ShaderPass
	},
	motion_blur: {
		shaderPass: ShaderPass.fromString(motionString) as ShaderPass
	},
	scramble: {
		shaderPass: ShaderPass.fromString(scrambleString) as ShaderPass,
		updateKnownUniforms: (state, knownUniforms) => {
			knownUniforms.set('scrambled', {
				name: 'scrambled',
				type: UniformType.INTVEC,
				value: state.scrambleState.slice(),
				vecSize: 16
			});
		}
	},
	snow: {
		shaderPass: ShaderPass.fromString(snowString) as ShaderPass
	},
	sobel: {
		shaderPass: ShaderPass.fromString(sobelString) as ShaderPass
	},
	vignette: {
		shaderPass: ShaderPass.fromString(vignetteString) as ShaderPass
	},
	water: {
		shaderPass: ShaderPass.fromString(waterString) as ShaderPass
	}
} as const;

function shuffleArray(arr: number[]) {
	for (let i = 0; i < arr.length; ++i) {
		let x = Math.round(Math.random() * (arr.length - 1));
		let y = Math.round(Math.random() * (arr.length - 1));
		if (x != y) {
			[arr[x], arr[y]] = [arr[y], arr[x]];
		}
	}
	return arr;
}

export function defaultPP(): PostProcessingState {
	return {
		bloom: false,
		crt: false,
		drunk: false,
		fisheye: false,
		hideCar: false,
		pixelate: false,
		pixelScale: 4.0,
		toon: false,
		toonScale: 2.0,
		min: false,
		motion_blur: false,
		scramble: false,
		scrambleState: shuffleArray([...Array(16).keys()]),
		snow: false,
		sobel: false,
		vignette: false,
		water: false
	};
}
export default class PostProcessingController {
	state: PostProcessingState;
	handler: PostprocessHandler | null;
	streetView: google.maps.StreetViewPanorama | null;
	constructor() {
		this.state = defaultPP();
		this.handler = null;
		this.streetView = null;
	}
	setHandler(handler: PostprocessHandler) {
		this.handler = handler;
	}
	assemblePasses() {
		let passes: ShaderPass[] = [];
		let knownUniforms: Map<string, Uniform> = new Map();
		for (let effectName of shaderToggles) {
			const effect = effects[effectName];
			if (this.state[effectName]) {
				passes.push(effect.shaderPass);
				if (effect.updateKnownUniforms) effect.updateKnownUniforms(this.state, knownUniforms);
			}
		}
		return CombinePasses(passes, knownUniforms);
	}
	fixupStateBeforeSet(newState: PostProcessingState) {
		const newlyToggledMutuallyExclusiveToggles: MutuallyExclusiveToggleTypes[] = [];
		for (let toggle of mutuallyExclusiveShaderToggles) {
			const oldval = this.state[toggle];
			const newval = newState[toggle];
			if (newval != oldval && newval) {
				newlyToggledMutuallyExclusiveToggles.push(toggle);
			}
		}
		if (newlyToggledMutuallyExclusiveToggles.length > 1) {
			throw 'Somehow toggled two mutually exclusive toggles at once?!';
		} else if (newlyToggledMutuallyExclusiveToggles.length == 1) {
			const changedToggle = newlyToggledMutuallyExclusiveToggles[0];
			for (let toggle of mutuallyExclusiveShaderToggles) {
				if (toggle != changedToggle) {
					newState[toggle] = false;
				}
			}
		}
		if (this.state.hideCar != newState.hideCar && this.streetView !== null) {
			const pov = this.streetView.getPov();
			window.requestAnimationFrame(() => {
				this.streetView?.setPov({
					heading: pov.heading + 1.0,
					pitch: pov.pitch + 1.0
				});
				window.requestAnimationFrame(() => {
					this.streetView?.setPov(pov);
				});
			});
		}
	}
	updateSpeeds(vx: number, vy: number) {
		if (this.handler) {
			this.handler.updateSpeed(vx, vy);
		}
	}
	updateState(newState: PostProcessingState) {
		this.fixupStateBeforeSet(newState);
		this.state = Object.assign(this.state, newState);
		this.passShaderInfoAndUniforms();
	}
	passShaderInfoAndUniforms() {
		let shaderInfo = this.assemblePasses() as ShaderInfo;
		if (this.handler) {
			this.handler.updateMaterial(shaderInfo);
			this.handler.toggleCar(this.state.hideCar);
		}
	}
	rescramble() {
		this.state.scrambleState = shuffleArray(this.state.scrambleState);
		this.passShaderInfoAndUniforms();
	}
	setupStreetView(streetView: google.maps.StreetViewPanorama) {
		this.streetView = streetView
		let listener: google.maps.MapsEventListener | null = null;
		streetView.addListener('visible_changed', () => {
			const visible = streetView.getVisible();
			listener?.remove();
			if (visible) {
				let oldPov = streetView.getPov();
				this.updateSpeeds(0, 0);
				let timer: number | undefined = undefined;
				listener = streetView.addListener('pov_changed', () => {
					const newPov = streetView.getPov();
					clearTimeout(timer);
					let vx = newPov.heading - oldPov.heading;
					if (Math.abs(vx) > 100.0) {
						if (vx < 0) {
							vx += 360.0;
						} else {
							vx -= 360.0;
						}
					}
					const vy = newPov.pitch - oldPov.pitch;
					this.updateSpeeds(vx, vy);
					oldPov = newPov;
					timer = setTimeout(() => {
						oldPov = streetView.getPov();
						this.updateSpeeds(0, 0);
					}, 100) as any;
				});
			}
		});
	}
}

