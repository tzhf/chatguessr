const Scoreboard = require("./Classes/Scoreboard");

const path = require("path");
const { ipcRenderer } = require("electron");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const port = process.env.SERVER_PORT;

const Store = require("./utils/Store");
const noCar = Store.getSettings().noCar;
drParseNoCar();

window.addEventListener("DOMContentLoaded", () => {
	window.ipcRenderer = require("electron").ipcRenderer;
	window.$ = window.jQuery = require("jquery");
	window.MAP = null;
	hijackMap();

	const head = document.getElementsByTagName("head")[0];

	const styles = document.createElement("link");
	styles.rel = "stylesheet";
	styles.type = "text/css";
	styles.href = `http://localhost:${port}/styles.css`;
	head.appendChild(styles);

	const scoreboardContainer = document.createElement("div");
	scoreboardContainer.setAttribute("id", "scoreboardContainer");
	scoreboardContainer.innerHTML = `
		<div id='scoreboard'>
			<div id='scoreboardHeader'>
				<span></span>
				<span id='scoreboardTitle'>GUESSES (0)</span>
				<label id='switchContainer'>
					<input id='switchBtn' type='checkbox' />
					<div class='slider'></div>
				</label>
			</div>
			<table id='datatable' width='100%'>
				<thead>
					<tr>
						<th>#</th>
						<th>Player</th>
						<th>Streak</th>
						<th>Distance</th>
						<th>Score</th>
					</tr>
				</thead>
				<tbody id='guessList'></tbody>
			</table>
		</div>`;
	document.body.appendChild(scoreboardContainer);

	const flagIcon = document.createElement("link");
	flagIcon.rel = "stylesheet";
	flagIcon.type = "text/css";
	flagIcon.href = `http://localhost:${port}/flag-icon.min.css`;
	head.appendChild(flagIcon);

	const jqueryUI = document.createElement("script");
	jqueryUI.type = "text/javascript";
	jqueryUI.src = `http://localhost:${port}/jquery-ui.min.js`;
	jqueryUI.addEventListener("load", () => loadDatatables());
	document.body.appendChild(jqueryUI);

	const loadDatatables = () => {
		const datatables = document.createElement("script");
		datatables.type = "text/javascript";
		datatables.src = `http://localhost:${port}/datatables.bundle.min.js`;
		datatables.addEventListener("load", () => init());
		document.body.appendChild(datatables);
	};
});

const init = () => {
	const markerRemover = document.createElement("style");
	markerRemover.innerHTML = ".map-pin{display:none}";

	const settingsIcon = document.createElement("div");
	settingsIcon.setAttribute("title", "Settings (ctrl+p)");
	settingsIcon.className = "settingsIcon";
	settingsIcon.innerHTML = "<span>⚙️</span>";
	settingsIcon.addEventListener("click", () => {
		ipcRenderer.send("openSettings");
	});
	document.body.appendChild(settingsIcon);

	const scoreboard = new Scoreboard();

	ipcRenderer.on("game-started", (e, isMultiGuess) => {
		scoreboard.show();
		scoreboard.reset(isMultiGuess);
	});

	ipcRenderer.on("refreshed-in-game", (e, noCompass) => {
		scoreboard.show();
		drParseNoCompass(noCompass);
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		clearMarkers();
	});

	ipcRenderer.on("render-guess", (e, guess, nbGuesses) => {
		scoreboard.setTitle(`GUESSES (${nbGuesses})`);
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (e, guesses, nbGuesses) => {
		scoreboard.setTitle(`GUESSES (${nbGuesses})`);
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("pre-round-results", () => document.body.appendChild(markerRemover));

	ipcRenderer.on("show-round-results", (e, round, location, scores) => {
		scoreboard.setTitle(`ROUND ${round} RESULTS`);
		scoreboard.displayScores(scores);
		scoreboard.showSwitch(false);
		populateMap(location, scores);
	});

	ipcRenderer.on("show-final-results", (e, totalScores) => {
		document.body.appendChild(markerRemover);
		scoreboard.setTitle("HIGHSCORES");
		scoreboard.showSwitch(false);
		scoreboard.displayScores(totalScores, true);
		clearMarkers();
	});

	ipcRenderer.on("next-round", (e, isMultiGuess) => {
		scoreboard.reset(isMultiGuess);
		scoreboard.showSwitch(true);
		setTimeout(() => {
			markerRemover.remove();
			clearMarkers();
		}, 1000);
	});

	ipcRenderer.on("switch-on", () => scoreboard.switchOn(true));
	ipcRenderer.on("switch-off", () => scoreboard.switchOn(false));

	ipcRenderer.on("game-settings-change", (e, noCompass) => drParseNoCompass(noCompass));
};

let markers = [];
let polylines = [];
function populateMap(location, scores) {
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
		url: `http://maps.google.com/maps?q=&layer=c&cbll=${location.lat},${location.lng}`,
		icon: icon,
		map: MAP,
	});
	google.maps.event.addListener(locationMarker, "click", () => {
		window.open(locationMarker.url, "_blank");
	});
	markers.push(locationMarker);

	icon.scale = 1;
	scores.forEach((score, index) => {
		const color = index == 0 ? "#E3BB39" : index == 1 ? "#C9C9C9" : index == 2 ? "#A3682E" : score.color;
		icon.fillColor = color;

		const guessMarker = new google.maps.Marker({
			position: score.position,
			icon: icon,
			map: MAP,
			label: { color: "#000", fontWeight: "bold", fontSize: "16px", text: `${index + 1}` },
		});
		google.maps.event.addListener(guessMarker, "mouseover", () => {
			infowindow.setContent(`
				<p class="gm-iw__content">
					<span style="font-size:14px;">${score.flag ? `<span class="flag-icon flag-icon-${score.flag}"></span>` : ""}${score.username}</span><br>
					${score.distance >= 1 ? parseFloat(score.distance.toFixed(1)) + "km" : parseInt(score.distance * 1000) + "m"}<br>
					${score.score}
				</p>
			`);
			infowindow.open(MAP, guessMarker);
		});
		google.maps.event.addListener(guessMarker, "mouseout", () => {
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
				map: MAP,
				path: [score.position, location],
			})
		);
	});
	// MAP.fitBounds(bounds);
}

function clearMarkers() {
	while (markers[0]) {
		markers.pop().setMap(null);
	}
	while (polylines[0]) {
		polylines.pop().setMap(null);
	}
}

function hijackMap() {
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
			const isGamePage = () => location.pathname.startsWith("/results/") || location.pathname.startsWith("/game/");
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
				function(...args) {
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
}

function drParseNoCompass(noCompass) {
	const style = document.getElementById("noCompass");
	if (noCompass) {
		if (!style) {
			const style = document.createElement("style");
			style.id = "noCompass";
			style.innerHTML = ".compass { display: none }";
			document.head.appendChild(style);
		}
	} else {
		if (style) style.remove();
	}
}

function drParseNoCar() {
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
		el.getContext = function() {
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
	document.createElement = function() {
		if (arguments[0] === "canvas" || arguments[0] === "CANVAS") {
			const el = f.apply(this, arguments);
			installGetContext(el);
			return el;
		}
		return f.apply(this, arguments);
	};
}
