const Preloader = require("./utils/Preloader");
const Scoreboard = require("./components/scoreboard/Scoreboard");

if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded", DOMLoaded);
} else {
	DOMLoaded();
}

async function DOMLoaded() {
	console.log("DOM loaded");
	window.ipcRenderer = require("electron").ipcRenderer;
	window.MAP = null;
	const [styles, jQuery, jQueryUI, scoreboardHTML, scoreboardCSS] = await Preloader.preload([
		"styles.css",
		"jquery.min.js",
		"jquery-ui.min.js",
		"scoreboard/scoreboard.html",
		"scoreboard/scoreboard.css",
	]);
	loadScripts(styles, jQuery, jQueryUI);
	const scoreboard = new Scoreboard(scoreboardHTML, scoreboardCSS);
	init(scoreboard);
	hijackMap();
}

const loadScripts = (styles, jQuery, jQueryUI) => {
	console.log("scripts loaded");
	const style = document.createElement("style");
	style.innerHTML = styles;
	document.body.appendChild(style);

	const jquery = document.createElement("script");
	jquery.innerHTML = jQuery;
	document.body.appendChild(jquery);

	const jqueryUi = document.createElement("script");
	jqueryUi.innerHTML = jQueryUI;
	document.body.appendChild(jqueryUi);
};

const init = (scoreboard) => {
	console.log("init/scoreboard loaded");
	const markerRemover = document.createElement("style");
	markerRemover.innerHTML = ".map-pin { display: none }";

	ipcRenderer.on("switch-on", () => scoreboard.switchOn(true));
	ipcRenderer.on("switch-off", () => scoreboard.switchOn(false));

	const hideTopBar = document.createElement("style");
	hideTopBar.innerHTML = `.layout{--layout-header-height:0rem;}.header__right{display:none;}.game-layout__panorama-canvas{height:100%;}.header__logo-image{margin-top: 10px;opacity: 0.9;}`;
	ipcRenderer.on("in-game", (e, noCar, noCompass) => {
		document.body.appendChild(hideTopBar);
		scoreboard.setTitle("GUESSES (0)");
		scoreboard.show(true);
		drParseNoCar(noCar);
		drParseNoCompass(noCompass);
	});

	ipcRenderer.on("out-game", () => {
		hideTopBar.remove();
		scoreboard.show(false);
		scoreboard.emptyGuessList();
		markerRemover.remove();
		clearMarkers();
	});

	ipcRenderer.on("next-round", () => {
		scoreboard.setTitle("GUESSES (0)");
		scoreboard.showSwitch(true);
		scoreboard.emptyGuessList();
		setTimeout(() => {
			clearMarkers();
			markerRemover.remove();
		}, 500);
	});

	ipcRenderer.on("render-user-guess", (e, guess, nbGuesses) => {
		scoreboard.setTitle(`GUESSES (${nbGuesses})`);
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("pre-round-results", () => {
		document.body.appendChild(markerRemover);
		scoreboard.setTitle("ROUND RESULTS");
		scoreboard.showSwitch(false);
	});

	ipcRenderer.on("show-round-results", (e, location, guesses) => {
		scoreboard.displayScores(guesses);
		populateMap(location, guesses);
	});

	ipcRenderer.on("show-total-results", (e, total) => {
		scoreboard.setTitle("TOTAL RESULTS");
		scoreboard.showSwitch(false);
		scoreboard.displayScores(total, true);
		clearMarkers();
	});

	ipcRenderer.on("game-settings-change", (e, noCar, noCompass) => {
		drParseNoCar(noCar);
		drParseNoCompass(noCompass);
	});
};

let markers = [];
let polylines = [];

const populateMap = (location, guesses) => {
	const infowindow = new google.maps.InfoWindow();
	// let bounds = new google.maps.LatLngBounds();
	const markerIcon = {
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
		position: { lat: location.lat, lng: location.lng },
		url: `http://maps.google.com/maps?q=&layer=c&cbll=${location.lat},${location.lng}`,
		icon: markerIcon,
		map: MAP,
	});
	google.maps.event.addListener(locationMarker, "click", () => {
		window.open(locationMarker.url, "_blank");
	});
	markers.push(locationMarker);
	// bounds.extend({ lat: location.lat, lng: location.lng });

	markerIcon.scale = 1;
	guesses.forEach((guess, index) => {
		const color = index == 0 ? "#FFD700" : index == 1 ? "#C9C9C9" : index == 2 ? "#B27F60" : guess.color;
		markerIcon.fillColor = color;

		const guessMarker = new google.maps.Marker({
			position: guess.position,
			icon: markerIcon,
			map: MAP,
			label: { color: "#000", fontWeight: "bold", fontSize: "16px", text: `${index + 1}` },
		});
		google.maps.event.addListener(guessMarker, "mouseover", () => {
			infowindow.setContent(`
				<p class="gm-iw__content">
					<span style="font-size:14px;">${guess.username}</span><br>
					${guess.distance >= 1 ? parseFloat(guess.distance.toFixed(1)) + "km" : parseInt(guess.distance * 1000) + "m"}<br>
					${guess.score}
				</p>
			`);
			infowindow.open(MAP, guessMarker);
		});
		google.maps.event.addListener(guessMarker, "mouseout", () => {
			infowindow.close();
		});
		markers.push(guessMarker);
		// bounds.extend({ lat: guess.location.lat, lng: guess.location.lng });

		polylines.push(
			new google.maps.Polyline({
				strokeColor: color,
				strokeWeight: 4,
				strokeOpacity: 0.6,
				geodesic: true,
				map: MAP,
				path: [
					{ lat: guess.position.lat, lng: guess.position.lng },
					{ lat: location.lat, lng: location.lng },
				],
			})
		);
	});
	// MAP.fitBounds(bounds);
};

const clearMarkers = () => {
	while (markers[0]) {
		markers.pop().setMap(null);
	}
	while (polylines[0]) {
		polylines.pop().setMap(null);
	}
};

const hijackMap = () => {
	const MAPS_API_URL = "https://maps.googleapis.com/maps/api/js?";
	const GOOGLE_MAPS_PROMISE = new Promise((resolve, reject) => {
		let scriptObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.tagName === "SCRIPT" && node.src.startsWith(MAPS_API_URL)) {
						node.onload = () => {
							scriptObserver.disconnect();
							scriptObserver = undefined;
							resolve();
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
					scriptObserver.observe(document.body, {
						childList: true,
					});
					bodyDone = true;
				}
			}
			if (!headDone && document.head) {
				if (scriptObserver) {
					scriptObserver.observe(document.head, {
						childList: true,
					});
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

	function runAsClient(f) {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.text = `(${f.toString()})()`;
		document.body.appendChild(script);
	}

	GOOGLE_MAPS_PROMISE.then(() => {
		runAsClient(() => {
			const google = window.google;
			const isGamePage = () => location.pathname.startsWith("/challenge/") || location.pathname.startsWith("/results/") || location.pathname.startsWith("/game/");
			const onMapUpdate = (map) => {
				try {
					if (!isGamePage()) return;
					MAP = map;
				} catch (error) {
					console.error("GeoguessrHijackMap Error:", error);
				}
			};

			const oldMap = google.maps.Map;
			google.maps.Map = Object.assign(
				function (...args) {
					const res = oldMap.apply(this, args);
					this.addListener("idle", () => {
						if (MAP != null) return;
						onMapUpdate(this);
					});
					return res;
				},
				{
					prototype: Object.create(oldMap.prototype),
				}
			);
		});
	});
};

const drParseNoCompass = (noCompass) => {
	const addCompassStyle = () => {
		const style = document.createElement("style");
		style.id = "noCompass";
		style.innerHTML = ".compass { display: none }";
		document.head.appendChild(style);
	};

	const style = document.getElementById("noCompass");
	if (noCompass) {
		if (!style) addCompassStyle();
	} else {
		if (style) style.remove();
	}
};

const drParseNoCar = (noCar) => {
	if (!noCar) return;

	const OPTIONS = {
		colorR: 0.5,
		colorG: 0.5,
		colorB: 0.5,
	};
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
}`;

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
}`;

	function installShaderSource(ctx) {
		const g = ctx.shaderSource;
		function shaderSource() {
			if (typeof arguments[1] === "string") {
				let glsl = arguments[1];
				if (glsl === vertexOld) glsl = vertexNew;
				else if (glsl === fragOld) glsl = fragNew;
				return g.call(this, arguments[0], glsl);
			}
			return g.apply(this, arguments);
		}
		shaderSource.bestcity = "bintulu";
		ctx.shaderSource = shaderSource;
	}

	function installGetContext(el) {
		const g = el.getContext;
		el.getContext = function () {
			if (arguments[0] === "webgl" || arguments[0] === "webgl2") {
				const ctx = g.apply(this, arguments);
				if (ctx && ctx.shaderSource && ctx.shaderSource.bestcity !== "bintulu") {
					installShaderSource(ctx);
				}
				return ctx;
			}
			return g.apply(this, arguments);
		};
	}

	const f = document.createElement;
	document.createElement = function () {
		if (arguments[0] === "canvas" || arguments[0] === "CANVAS") {
			const el = f.apply(this, arguments);
			installGetContext(el);
			return el;
		}
		return f.apply(this, arguments);
	};
};
