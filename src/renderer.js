'use strict';

window.chatguessrApi.init({
	populateMap,
	clearMarkers,
	drParseNoCar,
	drParseNoCompass,
	showSatelliteMap,
	hideSatelliteMap,
	centerSatelliteView,
})

/** @type {google.maps.Map | undefined} */
let globalMap = undefined;
/** @type {google.maps.LatLngLiteral | undefined} */
let satelliteCenter = undefined;
/** @type {google.maps.Map | undefined} */
let satelliteLayer = undefined;
/** @type {google.maps.Marker | undefined} */
let satelliteMarker = undefined;
const satelliteCanvas = document.createElement('div');
satelliteCanvas.id = 'satelliteCanvas';

hijackMap();

/** @type {google.maps.Marker[]} */
let markers = [];
/** @type {google.maps.Polyline[]} */
let polylines = [];

/** @type {import('./types').RendererApi['populateMap']} */
function populateMap(location, scores) {
	const map = globalMap;
	const infowindow = new google.maps.InfoWindow();
	// const bounds = new google.maps.LatLngBounds();
	const icon = {
		path: `M13.04,41.77c-0.11-1.29-0.35-3.2-0.99-5.42c-0.91-3.17-4.74-9.54-5.49-10.79c-3.64-6.1-5.46-9.21-5.45-12.07
			c0.03-4.57,2.77-7.72,3.21-8.22c0.52-0.58,4.12-4.47,9.8-4.17c4.73,0.24,7.67,3.23,8.45,4.07c0.47,0.51,3.22,3.61,3.31,8.11
			c0.06,3.01-1.89,6.26-5.78,12.77c-0.18,0.3-4.15,6.95-5.1,10.26c-0.64,2.24-0.89,4.17-1,5.48C13.68,41.78,13.36,41.78,13.04,41.77z
			`,
		fillColor: "#de3e3e",
		fillOpacity: 0.7,
		scale: 1.2,
		strokeColor: "#000000",
		strokeWeight: 1,
		anchor: new google.maps.Point(14, 43),
		labelOrigin: new google.maps.Point(13.5, 15),
	};

	const locationMarker = new google.maps.Marker({
		position: location,
		icon,
		map,
	});
	locationMarker.addListener("click", () => {
		window.open(`http://maps.google.com/maps?q=&layer=c&cbll=${location.lat},${location.lng}`, "_blank");
	});
	markers.push(locationMarker);

	icon.scale = 1;
	scores.forEach((score, index) => {
		const color = index == 0 ? "#E3BB39" : index == 1 ? "#C9C9C9" : index == 2 ? "#A3682E" : score.color;
		icon.fillColor = color;

		const guessMarker = new google.maps.Marker({
			position: score.position,
			icon,
			map,
			label: { color: "#000", fontWeight: "bold", fontSize: "16px", text: `${index + 1}` },
			clickable: false,
			optimized: true,
		});
		guessMarker.addListener("mouseover", () => {
			infowindow.setContent(`
				<p class="gm-iw__content">
					<span style="font-size:14px;">${score.flag ? `<span class="flag-icon flag-icon-${score.flag}"></span>` : ""}${score.username}</span><br>
					${score.distance >= 1 ? score.distance.toFixed(1) + "km" : Math.floor(score.distance * 1000) + "m"}<br>
					${score.score}
				</p>
			`);
			infowindow.open(globalMap, guessMarker);
		});
		guessMarker.addListener("mouseout", () => {
			infowindow.close();
		});
		markers.push(guessMarker);
		// bounds.extend(score.position);

		polylines.push(
			new google.maps.Polyline({
				strokeColor: color,
				strokeWeight: 4,
				strokeOpacity: 0.6,
				geodesic: true,
				map,
				path: [score.position, location],
			})
		);
	});
	// MAP.fitBounds(bounds);
}

/** @type {import('./types').RendererApi['clearMarkers']} */
function clearMarkers() {
	for (const marker of markers) {
		marker.setMap(null);
	}
	for (const line of polylines) {
		line.setMap(null);
	}
	markers = [];
	polylines = [];
}

function hijackMap() {
	const MAPS_API_URL = "https://maps.googleapis.com/maps/api/js?";
	const GOOGLE_MAPS_PROMISE = new Promise((resolve) => {
		let scriptObserver = new MutationObserver((mutations, observer) => {
			for (const mutation of mutations) {
				for (const tmp of mutation.addedNodes) {
					/** @type {HTMLScriptElement} */
					// @ts-ignore
					const node = tmp;
					if (node.tagName === "SCRIPT" && node.src.startsWith(MAPS_API_URL)) {
						node.onload = () => {
							observer.disconnect();
							resolve(undefined);
						};
					}
				}
			}
		});

		let bodyDone = false;
		let headDone = false;

		new MutationObserver((_, observer) => {
			if (!bodyDone && document.body) {
				if (scriptObserver) {
					scriptObserver.observe(document.body, { childList: true });
					bodyDone = true;
				}
			}
			if (!headDone && document.head) {
				if (scriptObserver) {
					scriptObserver.observe(document.head, { childList: true });
					headDone = true;
				}
			}
			if (headDone && bodyDone) {
				observer.disconnect();
			}
		}).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	});

	GOOGLE_MAPS_PROMISE.then(() => {
		const google = window.google;
		const isGamePage = () => location.pathname.startsWith("/results/") || location.pathname.startsWith("/game/");
		/** @param {google.maps.Map} map */
		function onMapUpdate(map) {
			try {
				if (!isGamePage())
					return;
				globalMap = map;
			} catch (error) {
				console.error("GeoguessrHijackMap Error:", error);
			}
		}

		google.maps.Map = class extends google.maps.Map {
			/**
			 * @param {Element} mapDiv 
			 * @param {google.maps.MapOptions} opts 
			 */
			constructor(mapDiv, opts) {
				super(mapDiv, opts)
				this.addListener("idle", () => {
					if (globalMap == null) {
						onMapUpdate(this);
					}
				});
			}
		};
	});
}

/** @type {import('./types').RendererApi['showSatelliteMap']} */
function showSatelliteMap(location) {
	satelliteCenter = location;
	const bounds = {
		north: location.lat + 1,
		south: location.lat - 1,
		west: location.lng - 1,
		east: location.lng + 1,
	};

	setTimeout(() => {
		if (!satelliteCanvas.closest('.game-layout__canvas')) {
			document.querySelector('.game-layout__canvas').append(satelliteCanvas);
		}

		satelliteLayer ??= new google.maps.Map(satelliteCanvas, {
			fullscreenControl: false,
			mapTypeId: google.maps.MapTypeId.SATELLITE,
			zoom: 25,
			minZoom: 10,
		});
		satelliteMarker?.setMap(null);
		satelliteMarker = new google.maps.Marker({
			position: location,
			map: satelliteLayer,
		});

		satelliteLayer.setOptions({
			center: location,
			restriction: {
				latLngBounds: bounds,
				strictBounds: false,
			},
		});

		globalMap.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	}, 2000);
}

/** @type {import('./types').RendererApi['hideSatelliteMap']} */
function hideSatelliteMap() {
	globalMap.setMapTypeId(google.maps.MapTypeId.ROADMAP);
}

/** @type {import('./types').RendererApi['centerSatelliteView']} */
function centerSatelliteView() {
	satelliteLayer.setCenter(satelliteCenter);
}

/** @type {import('./types').RendererApi['drParseNoCompass']} */
// TODO just use `webContents.insertCSS` for this
function drParseNoCompass(noCompass) {
	const style = document.querySelector("#noCompass");
	if (noCompass) {
		if (!style) {
			const style = document.createElement("style");
			style.id = "noCompass";
			style.innerHTML = ".compass{display: none}";
			document.head.appendChild(style);
		}
	} else {
		if (style) style.remove();
	}
}

/** @type {import('./types').RendererApi['drParseNoCar']} */
function drParseNoCar(noCar) {
	if (!noCar) return;

	const OPTIONS = { colorR: 0.5, colorG: 0.5, colorB: 0.5 };
	const vertexOld =
		"const float f=3.1415926;varying vec3 a;uniform vec4 b;attribute vec3 c;attribute vec2 d;uniform mat4 e;void main(){vec4 g=vec4(c,1);gl_Position=e*g;a=vec3(d.xy*b.xy+b.zw,1);a*=length(c);}";
	const fragOld =
		"precision highp float;const float h=3.1415926;varying vec3 a;uniform vec4 b;uniform float f;uniform sampler2D g;void main(){vec4 i=vec4(texture2DProj(g,a).rgb,f);gl_FragColor=i;}";
	const vertexNew = `
		const float f=3.1415926;
		varying vec3 a;
		varying vec3 potato;
		uniform vec4 b;
		attribute vec3 c;
		attribute vec2 d;
		uniform mat4 e;
		void main(){
			vec4 g=vec4(c,1);
			gl_Position=e*g;
			a = vec3(d.xy * b.xy + b.zw,1);
			a *= length(c);
			potato = vec3(d.xy, 1.0) * length(c);
		}
	`;

	const fragNew = `
		precision highp float;
		const float h=3.1415926;
		varying vec3 a;
		varying vec3 potato;
		uniform vec4 b;
		uniform float f;
		uniform sampler2D g;
		void main(){

		vec2 aD = potato.xy / a.z;
		float thetaD = aD.y;

		float thresholdD1 = 0.6;
		float thresholdD2 = 0.7;

		float x = aD.x;
		float y = abs(4.0*x - 2.0);
		float phiD = smoothstep(0.0, 1.0, y > 1.0 ? 2.0 - y : y);

		vec4 i = vec4(thetaD > mix(thresholdD1, thresholdD2, phiD)
		? vec3(float(${OPTIONS.colorR}), float(${OPTIONS.colorG}), float(${OPTIONS.colorB})) // texture2DProj(g,a).rgb * 0.25
		: texture2DProj(g,a).rgb,f);
		gl_FragColor=i;
		}
	`;

    /** @param {WebGLRenderingContext | WebGL2RenderingContext} ctx */
	function installShaderSource(ctx) {
		const g = ctx.shaderSource;
		/** @type {WebGLRenderingContext['shaderSource']} */
		function shaderSource(...args) {
			if (typeof args[1] === "string") {
				let glsl = args[1];
				if (glsl === vertexOld) glsl = vertexNew;
				else if (glsl === fragOld) glsl = fragNew;
				return g.call(this, args[0], glsl);
			}
			return g.apply(this, args);
		}
		shaderSource.bestcity = "bintulu";
		ctx.shaderSource = shaderSource;
	}

    /** @param {HTMLCanvasElement} el */
	function installGetContext(el) {
		const g = el.getContext;
		el.getContext = function (...args) {
			if (args[0] === "webgl" || args[0] === "webgl2") {
				/** @type {WebGLRenderingContext | WebGL2RenderingContext} */
				const ctx = g.apply(this, args);
				if (ctx && ctx.shaderSource && ctx.shaderSource.bestcity !== "bintulu") {
					installShaderSource(ctx);
				}
				return ctx;
			}
			return g.apply(this, args);
		};
	}

	const createElement = document.createElement.bind(document);
	document.createElement = function (...args) {
		if (args[0] === "canvas" || args[0] === "CANVAS") {
			const el = createElement('canvas');
			installGetContext(el);
			return el;
		}
		return createElement(...args);
	};
}
