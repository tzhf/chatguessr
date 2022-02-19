console.log("Geoguessr Unity Script v5.1.0 by Jupaoqq");
let satelliteMode = true;
let tempRad = 60;

let customMode = "terrain";

// API Keys

var MS_API_KEY = "AjWqExh5E9aZfgKKBrgJMM2tbBeJ_q9ET7__194VDfcpl8lEWYTYNRWoYE1kqy95";
var YANDEX_API_KEY = "b704b5a9-3d67-4d19-b702-ec7807cecfc6";
var KAKAO_API_KEY = "cbacbe41e3a223d794f321de4f3e247b";
const MAPS_API_URL = "https://maps.googleapis.com/maps/api/js"; // removed "?" from the link
var MAPILLARY_API_KEY_LIST = [
	"MLY|6723031704435203|5afd537469b114cf814881137ad74b7c",
	"MLY|6691659414239148|b45e7e82cde126044cbc2cf5d4a7c9b1",
	"MLY|5074369465929308|f7ad2802cbaf26c63f88046a292df68b",
	"MLY|7451643761528219|6477f2db0e3928b51e45ec9311983936",
	"MLY|4855256237866198|6d0464771831c8a4bf2be095e1e1aabc",
	"MLY|4772941976102161|8458d4f08d2e1970cdfe0a4e242c04ff",
	"MLY|4492067214235489|94c44703942362ad6f6b70b5d32c3a45",
	"MLY|4618251611628426|0cef71d6ec8b997a5ec06ecdeabf11ec",
	"MLY|4096846270415982|fa2ce29641503e6ef665f17459633570",
	"MLY|4231415756962414|fe353880fd246e8a4a6ae32152f7dbb0",
];

var MAPILLARY_API_KEY = MAPILLARY_API_KEY_LIST[Math.floor(Math.random() * MAPILLARY_API_KEY_LIST.length)];

// Store each player instance

let YandexPlayer, KakaoPlayer, GooglePlayer, MapillaryPlayer, MSStreetPlayer;
let YANDEX_INJECTED = false;
let BAIDU_INJECTED = false;
let KAKAO_INJECTED = false;
let MAPILLARY_INJECTED = false;
let MS_INJECTED = false;

// Game mode detection

let isBattleRoyale = false;
let isDuel = false;
let isBullseye = false;

// Player detection and coordinate conversion

let nextPlayer = "Google";
let global_lat = 0;
let global_lng = 0;
let global_panoID = null;
let global_BDID, global_BDAh, global_BDBh;
let yId, yTime, yEnd, iId;
let global_heading = null;
let global_pitch = null;

let krCoordinates = [38.75292321084364, 124.2804539232574, 33.18509676203202, 129.597381999198];
let global_radi = 100;

// Callback variables

let eventListenerAttached = false;
let povListenerAttached = false;
let playerLoaded = false;
let syncLoaded = false;

// Minimize Yandex API use

let yandex_map = false;
let Kakao_map = false;

// Mapillary Image Key

let mmKey = 0;

// Handle Yandex compass

let COMPASS = null;

// Handle undo

let locHistory = [];
let defaultPanoIdChange = true;

// Round check

let ROUND = 0;
let CURRENT_ROUND_DATA = null;

let switch_call = true;
let one_reset = false;
// let cnt = 0;

let cn_tips = false;
var isFirefox = typeof InstallTrigger !== "undefined";

let linksList = [];
let fire1 = true;

// Satellite Map Radius (in Meters)
let ms_radius = 10000;

// Create the Maps, but not reload API
let partialCreateYandex = false;
let partialCreateKakao = false;
let partialCreateMapillary = false;
let partialCreateMS = false;

// let NEW_ROUND_LOADED = false;

// Geoguessr Canvas String Names

let GENERAL_CANVAS = ".game-layout__panorama-canvas";
let BR_CANVAS = ".br-game-layout__panorama-canvas";
let FAIL_TO_LOAD_CANVAS = ".game-layout__panorama-message";
let DUEL_LAYOUT = ".game_layout__TO_jf";
let DUELS_CANVAS = ".game-panorama_panorama__rdhFg";
let DUELS_CANVAS2 = ".game-panorama_panoramaCanvas__PNKve";
let BULLSEYE_CANVAS = ".game-panorama_panorama__ncMwh";
let BULLSEYE_CANVAS2 = ".game-panorama_panoramaCanvas__r_5ea";
let DUELS_POPUP = ".overlay_overlay__AR02x";
let BR_POPUP = ".popup__content";

let BR_LOAD_KAKAO = false;
let BR_LOAD_YANDEX = false;
let BR_LOAD_MS = false;

let ms_sat_map = false;
let rtded = false;
let NM = false;
let NP = false;
let NZ = false;

/**
 * Helper Functions
 */

// Highlight API Load Message

function myHighlight(...args) {
	console.log(`%c${[...args]}`, "color: dodgerblue; font-size: 24px;");
}

// Hex to number conversion for Baidu coordinate conversion

function hex2a(hexx) {
	var hex = hexx.toString();
	var str = "";
	for (var i = 0; i < hex.length; i += 2) {
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	}
	return str;
}

// Coordinate computation given heading, distance and current coordinates for teleport

function FindPointAtDistanceFrom(lat, lng, initialBearingRadians, distanceKilometres) {
	const radiusEarthKilometres = 6371.01;
	var distRatio = distanceKilometres / radiusEarthKilometres;
	var distRatioSine = Math.sin(distRatio);
	var distRatioCosine = Math.cos(distRatio);

	var startLatRad = DegreesToRadians(lat);
	var startLonRad = DegreesToRadians(lng);

	var startLatCos = Math.cos(startLatRad);
	var startLatSin = Math.sin(startLatRad);

	var endLatRads = Math.asin(startLatSin * distRatioCosine + startLatCos * distRatioSine * Math.cos(initialBearingRadians));

	var endLonRads = startLonRad + Math.atan2(Math.sin(initialBearingRadians) * distRatioSine * startLatCos, distRatioCosine - startLatSin * Math.sin(endLatRads));

	return { lat: RadiansToDegrees(endLatRads), lng: RadiansToDegrees(endLonRads) };
}

function DegreesToRadians(degrees) {
	const degToRadFactor = Math.PI / 180;
	return degrees * degToRadFactor;
}

function RadiansToDegrees(radians) {
	const radToDegFactor = 180 / Math.PI;
	return radians * radToDegFactor;
}

function toRadians(degrees) {
	return (degrees * Math.PI) / 180;
}

// Converts from radians to degrees.
function toDegrees(radians) {
	return (radians * 180) / Math.PI;
}

function bearing(start_latitude, start_longitude, stop_latitude, stop_longitude) {
	let y = Math.sin(stop_longitude - start_longitude) * Math.cos(stop_latitude);
	let x = Math.cos(start_latitude) * Math.sin(stop_latitude) - Math.sin(start_latitude) * Math.cos(stop_latitude) * Math.cos(stop_longitude - start_longitude);
	let brng = (Math.atan2(y, x) * 180) / Math.PI;
	return brng;
}

// Check if two floating point numbers are really really really really close to each other (to 10 decimal points)
function almostEqual(a, b) {
	return a.toFixed(10) === b.toFixed(10);
}

function almostEqual2(a, b) {
	return a.toFixed(3) === b.toFixed(3);
}

function moveFrom(coords, angle, distance) {
	const R_EARTH = 6378.137;
	const M = 1 / (((2 * Math.PI) / 360) * R_EARTH) / 1000;
	let radianAngle = (-angle * Math.PI) / 180;
	let x = 0 + distance * Math.cos(radianAngle);
	let y = 0 + distance * Math.sin(radianAngle);

	let newLat = coords.lat + y * M;
	let newLng = coords.lng + (x * M) / Math.cos(coords.lat * (Math.PI / 180));
	return { lat: newLat, lng: newLng };
}

function getBBox(coordinates, meters) {
	let SW = moveFrom(coordinates, 135, meters);
	let NE = moveFrom(coordinates, 315, meters);
	return `${SW.lng},${SW.lat},${NE.lng},${NE.lat}`;
}

function getBBox2(coordinates, meters) {
	let SW = moveFrom(coordinates, 135, meters);
	let NE = moveFrom(coordinates, 315, meters);
	return [NE.lat, SW.lng, SW.lat, NE.lng];
}

function distance(lat1, lon1, lat2, lon2) {
	var p = 0.017453292519943295; // Math.PI / 180
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

	return 1000 * 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

// Script injection, extracted from extenssr:
// https://gitlab.com/nonreviad/extenssr/-/blob/main/src/injected_scripts/maps_api_injecter.ts

function overrideOnLoad(googleScript, observer, overrider) {
	const oldOnload = googleScript.onload;
	googleScript.onload = (event) => {
		const google = window.google;
		if (google) {
			observer.disconnect();
			overrider(google);
		}
		if (oldOnload) {
			oldOnload.call(googleScript, event);
		}
	};
}

function grabGoogleScript(mutations) {
	for (const mutation of mutations) {
		for (const newNode of mutation.addedNodes) {
			const asScript = newNode;
			if (asScript && asScript.src && asScript.src.startsWith("https://maps.googleapis.com/")) {
				//asScript.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDqRTXlnHXELLKn7645Q1L_5oc4CswKZK4&v=3&libraries=places,drawing&language=ja&region=JP"
				return asScript;
			}
		}
	}
	return null;
}

function injecter(overrider) {
	if (document.documentElement) {
		injecterCallback(overrider);
	} else {
		alert("Script didn't load, refresh to try loading the script");
	}
}

function injecterCallback(overrider) {
	new MutationObserver((mutations, observer) => {
		const googleScript = grabGoogleScript(mutations);
		if (googleScript) {
			overrideOnLoad(googleScript, observer, overrider);
		}
	}).observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * Creates Unity buttons
 *
 * @returns Promise
 */
function UnityInitiate() {
	const google = window.google;
	let curPosition;
	let kakao_enabled = true;

	function svCheck(data, status) {
		if (status === "OK") {
			// console.log("STATUS OK");
			switch_call = false;
		} else {
			console.log("STATUS NOT OK");
		}
	}

	google.maps.Map = class extends google.maps.Map {
		constructor(...args) {
			super(...args);
		}
	};

	const svService = new google.maps.StreetViewService();
	google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
		constructor(...args) {
			super(...args);
			GooglePlayer = this;

			const isGamePage = () =>
				location.pathname.startsWith("/challenge/") ||
				location.pathname.startsWith("/results/") ||
				location.pathname.startsWith("/game/") ||
				location.pathname.startsWith("/battle-royale/") ||
				location.pathname.startsWith("/duels/") ||
				location.pathname.startsWith("/team-duels/") ||
				location.pathname.startsWith("/bullseye/");

			this.addListener("position_changed", () => {
				// Maybe this could be used to update the position in the other players
				// so that they are always in sync
				try {
					if (!isGamePage()) return;
					const lat = this.getPosition().lat();
					const lng = this.getPosition().lng();
					const { heading } = this.getPov();

					curPosition = { lat, lng, heading };
				} catch (e) {
					console.error("GeoGuessr Path Logger Error:", e);
				}
			});
			this.addListener("pov_changed", () => {
				const { heading, pitch } = this.getPov();
				if (KakaoPlayer) {
					if (typeof KakaoPlayer !== "string") {
						const vp = KakaoPlayer.getViewpoint();
						// Prevent a recursive loop: only update kakao's viewpoint if it got out of sync with google's
						if ((!almostEqual(vp.pan, heading) || !almostEqual(vp.tilt, pitch)) && nextPlayer == "Kakao") {
							KakaoPlayer.setViewpoint({ pan: heading, tilt: pitch, zoom: vp.zoom });
						}
					}
				}
			});
		}
	};

	var switchCovergeButton = document.createElement("Button");
	switchCovergeButton.classList.add("unity-btn");
	switchCovergeButton.id = "switch";
	switchCovergeButton.init = false;
	switchCovergeButton.nextPlayer = "Google";
	switchCovergeButton.useGoogle = false;
	switchCovergeButton.lng = 0;
	switchCovergeButton.lat = 0;
	switchCovergeButton.heading = 0;
	switchCovergeButton.innerHTML = "Switch Coverage";
	switchCovergeButton.small_canvas = false;
	switchCovergeButton.style =
		"visibility:hidden;width:8.5em;height:2em;position:absolute;z-index:99999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(switchCovergeButton);
	switchCovergeButton.addEventListener("click", () => {
		let GOOGLE_MAPS_CANVAS1 = document.querySelector(".game-layout__panorama-canvas");
		let GOOGLE_MAPS_CANVAS2 = document.querySelector(".br-game-layout__panorama-canvas");
		let GOOGLE_MAPS_CANVAS3 = document.querySelector(".inactive");
		let GOOGLE_MAPS_CANVAS4 = document.querySelector(".game-panorama_panoramaCanvas__r_5ea");
		let duel = false;

		let GOOGLE_MAPS_CANVAS = null;
		if (GOOGLE_MAPS_CANVAS1 !== null) {
			GOOGLE_MAPS_CANVAS = GOOGLE_MAPS_CANVAS1;
		} else if (GOOGLE_MAPS_CANVAS2 !== null) {
			GOOGLE_MAPS_CANVAS = GOOGLE_MAPS_CANVAS2;
		} else if (GOOGLE_MAPS_CANVAS4 !== null) {
			GOOGLE_MAPS_CANVAS = GOOGLE_MAPS_CANVAS4;
		}
		if (GOOGLE_MAPS_CANVAS3 !== null) {
			duel = true;
		}

		let KAKAO_MAPS_CANVAS = document.getElementById("roadview");
		let YANDEX_MAPS_CANVAS = document.querySelector(".ymaps-2-1-79-panorama-screen");
		let MAPILLARY_MAPS_CANVAS = document.getElementById("mapillary-player");
		let BAIDU_MAPS_CANVAS = document.getElementById("i_container");
		let MS_MAPS_CANVAS = document.getElementById("ms-player");
		//         if (switchCovergeButton.nextPlayer !== "Baidu") {
		if (switchCovergeButton.useGoogle == false) {
			if (duel) {
				document.getElementById("default_player").className = "game-panorama_panoramaCanvas__PNKve";
				if (switchCovergeButton.nextPlayer == "Kakao") {
					KAKAO_MAPS_CANVAS.className = "inactive";
				} else if (switchCovergeButton.nextPlayer == "MS Satellite" || switchCovergeButton.nextPlayer == "MS Streetside") {
					MS_MAPS_CANVAS.className = "inactive";
				} else {
					MAPILLARY_MAPS_CANVAS.className = "inactive";
					MAPILLARY_MAPS_CANVAS.style.visibility = "hidden";
				}
			} else {
				GOOGLE_MAPS_CANVAS.style.visibility = "";
				if (switchCovergeButton.nextPlayer == "Kakao") {
					KAKAO_MAPS_CANVAS.style.visibility = "hidden";
				} else if (switchCovergeButton.nextPlayer == "Yandex") {
					YANDEX_MAPS_CANVAS.style.visibility = "hidden";
				} else if (switchCovergeButton.nextPlayer == "Baidu") {
					BAIDU_MAPS_CANVAS.style.visibility = "hidden";
				} else if (switchCovergeButton.nextPlayer == "Mapillary" || switchCovergeButton.nextPlayer == "Google") {
					MAPILLARY_MAPS_CANVAS.style.visibility = "hidden";
				} else if (switchCovergeButton.nextPlayer == "MS Satellite" || switchCovergeButton.nextPlayer == "MS Streetside") {
					MS_MAPS_CANVAS.style.visibility = "hidden";
				}
			}
			const lat = GooglePlayer.getPosition().lat();
			const lng = GooglePlayer.getPosition().lng();
			switch_call = true;
			if (!almostEqual2(lat, switchCovergeButton.lat) || !almostEqual2(lat, switchCovergeButton.lng)) {
				svService.getPanorama({ location: { lat: switchCovergeButton.lat, lng: switchCovergeButton.lng }, radius: 1000 }, svCheck);
			}
			switchCovergeButton.useGoogle = true;
			switchCovergeButton.init = false;
			console.log("use Google");
		} else {
			if (duel) {
				document.getElementById("default_player").className = "inactive";
				if (switchCovergeButton.nextPlayer == "Kakao") {
					KAKAO_MAPS_CANVAS.className = "game-panorama_panoramaCanvas__PNKve";
				} else if (switchCovergeButton.nextPlayer == "MS Satellite" || switchCovergeButton.nextPlayer == "MS Streetside") {
					MS_MAPS_CANVAS.className = "game-panorama_panoramaCanvas__PNKve";
				} else {
					MAPILLARY_MAPS_CANVAS.className = "game-panorama_panoramaCanvas__PNKve";
					MAPILLARY_MAPS_CANVAS.style.visibility = "";
					MapillaryPlayer.resize();
					//window.dispatchEvent(new Event('resize'));
					// document.querySelector(".mapillary-canvas").style.;
					// mapillary-canvas
				}
			} else {
				GOOGLE_MAPS_CANVAS.style.visibility = "hidden";
				if (switchCovergeButton.nextPlayer == "Kakao") {
					KAKAO_MAPS_CANVAS.style.visibility = "";
				} else if (switchCovergeButton.nextPlayer == "Yandex") {
					YANDEX_MAPS_CANVAS.style.visibility = "";
				} else if (switchCovergeButton.nextPlayer == "Baidu") {
					BAIDU_MAPS_CANVAS.style.visibility = "";
				} else if (switchCovergeButton.nextPlayer == "Mapillary" || switchCovergeButton.nextPlayer == "Google") {
					MAPILLARY_MAPS_CANVAS.style.visibility = "";
				} else if (switchCovergeButton.nextPlayer == "MS Satellite" || switchCovergeButton.nextPlayer == "MS Streetside") {
					MS_MAPS_CANVAS.style.visibility = "";
				}
			}
			switchCovergeButton.useGoogle = false;
			switchCovergeButton.init = true;
			console.log("use Others");
		}
	});

	var timeMachineNewerBtn = document.createElement("Button");
	timeMachineNewerBtn.classList.add("unity-btn");
	timeMachineNewerBtn.id = "plus year";
	timeMachineNewerBtn.innerHTML = "+";
	timeMachineNewerBtn.style =
		"visibility:hidden;width:2em;height:2em;position:absolute;z-index:99999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(timeMachineNewerBtn);
	timeMachineNewerBtn.addEventListener("click", () => {
		if (timeMachineBtn.index < timeMachineBtn.list.length - 1 && !timeMachineBtn.plusminusLock) {
			timeMachineBtn.index = timeMachineBtn.index + 1;
			GooglePlayer.setPano(timeMachineBtn.list[timeMachineBtn.index][0]);
			timeMachineBtn.innerHTML = "<font size=2>[" + (timeMachineBtn.index + 1) + "] " + timeMachineBtn.list[timeMachineBtn.index][1] + "</font>";
			// console.log(timeMachineBtn.index)
		}
		GenBtnColor();
	});

	var timeMachineOlderBtn = document.createElement("Button");
	timeMachineOlderBtn.classList.add("unity-btn");
	timeMachineOlderBtn.id = "minus year";
	timeMachineOlderBtn.innerHTML = "-";
	timeMachineOlderBtn.style =
		"visibility:hidden;width:2em;height:2em;position:absolute;z-index:99999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(timeMachineOlderBtn);
	timeMachineOlderBtn.addEventListener("click", () => {
		if (timeMachineBtn.index > 0 && !timeMachineBtn.plusminusLock) {
			timeMachineBtn.index = timeMachineBtn.index - 1;
			GooglePlayer.setPano(timeMachineBtn.list[timeMachineBtn.index][0]);
			timeMachineBtn.innerHTML = "<font size=2>[" + (timeMachineBtn.index + 1) + "] " + timeMachineBtn.list[timeMachineBtn.index][1] + "</font>";
			// console.log(timeMachineBtn.index)
		}
		GenBtnColor();
	});

	function svCheck2(data, status) {
		let l = [];
		if (status === "OK") {
			// console.log("OK for " + data.location.latLng + " at ID " + data.location.pano);
			// console.log(data.time)
			for (const alt of data.time) {
				let date = Object.values(alt).find((value) => value instanceof Date);

				l.push([alt.pano, date.toDateString()]);
			}
			// console.log(l);
			timeMachineBtn.list = l;
			timeMachineBtn.index = l.length - 1;
			timeMachineBtn.innerHTML = "<font size=2>[" + (timeMachineBtn.index + 1) + "] " + timeMachineBtn.list[timeMachineBtn.index][1] + "</font>";
			GenBtnColor();
			timeMachineBtn.plusminusLock = false;
			// timeMachineOlderBtn.click()
			// timeMachineBtn.innerHTML = "Default Date";
		}
	}

	var timeMachineBtn = document.createElement("Button");
	timeMachineBtn.classList.add("unity-btn");
	timeMachineBtn.id = "Date Button";
	timeMachineBtn.plusminusLock = true;
	timeMachineBtn.panoId = 0;
	timeMachineBtn.index = -1;
	timeMachineBtn.list = [];
	timeMachineBtn.innerHTML = "Time Machine";
	timeMachineBtn.style =
		"visibility:hidden;width:10em;height:2em;position:absolute;z-index:99999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(timeMachineBtn);
	timeMachineBtn.addEventListener("click", () => {
		// console.log(timeMachineBtn.index)
		if (timeMachineBtn.panoId != 0) {
			if (timeMachineBtn.index == -1) {
				svService.getPanorama({ pano: timeMachineBtn.panoId }, svCheck2);
			} else {
				timeMachineBtn.index = timeMachineBtn.list.length - 1;
				GooglePlayer.setPano(timeMachineBtn.list[timeMachineBtn.index][0]);
				timeMachineBtn.innerHTML = "<font size=2>[" + (timeMachineBtn.index + 1) + "] " + timeMachineBtn.list[timeMachineBtn.index][1] + "</font>";
				GenBtnColor();
			}
		} else {
			timeMachineBtn.panoId = GooglePlayer.pano;
			svService.getPanorama({ pano: timeMachineBtn.panoId }, svCheck2);
		}
	});

	var HelpBtn = document.createElement("Button");
	HelpBtn.classList.add("unity-btn");
	HelpBtn.id = "Help Button";
	HelpBtn.innerHTML = "Script Help";
	HelpBtn.style =
		"visibility:hidden;width:6em;height:2em;position:absolute;z-index:99999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(HelpBtn);
	HelpBtn.addEventListener("click", () => {
		window.open("https://docs.google.com/document/d/18nLXSQQLOzl4WpUgZkM-mxhhQLY6P3FKonQGp-H0fqI/edit?usp=sharing");
	});

	var playYoutubeBtn = document.createElement("Button");
	playYoutubeBtn.classList.add("unity-btn");
	playYoutubeBtn.id = "Youtube Button";
	playYoutubeBtn.innerHTML = "Play video";
	playYoutubeBtn.style =
		"visibility:hidden;width:6em;height:4.5em;position:absolute;z-index:999999;background-color: #BF40BF;border: none;color: white;padding: none;text-align: center;vertical-align: text-top;text-decoration: none;display: inline-block;font-size: 16px;";
	document.body.appendChild(playYoutubeBtn);
	playYoutubeBtn.addEventListener("click", () => {
		let iframe = document.getElementById("i_container");
		iframe.style.position = "absolute";
		iframe.allow = "autoplay";
		let srcString = "https://www.youtube.com/embed/" + yId + "?&playlist=" + yId + "&autoplay=1&modestbranding=1&controls=0&start=";
		if (yTime == "0" && yEnd == "0") {
		} else {
			srcString += yTime + "&end=" + yEnd;
		}
		iframe.src = srcString;
		iframe.style.visibility = "";
		playYoutubeBtn.innerHTML = "Play video from start";
	});

	console.log("Script buttons Loaded");
}

function GenBtnColor() {
	if (timeMachineBtn.index == timeMachineBtn.list.length - 1) {
		timeMachineNewerBtn.style.backgroundColor = "red";
		timeMachineNewerBtn.disabled = true;
	} else {
		timeMachineNewerBtn.style.backgroundColor = "#BF40BF";
		timeMachineNewerBtn.disabled = false;
	}
	if (timeMachineBtn.index == 0) {
		timeMachineOlderBtn.style.backgroundColor = "red";
		timeMachineOlderBtn.disabled = true;
	} else {
		timeMachineOlderBtn.style.backgroundColor = "#BF40BF";
		timeMachineOlderBtn.disabled = false;
	}
}

/**
 * Handle Keyboard inputs
 */

function kBoard() {
	document.addEventListener("keydown", logKey);
}

/**
 * Hide or reveal the buttons, and disable buttons if such feature is not available
 */

// function setHidden(cond) {
// 	if (cond) {
// 		if (mainMenuBtn != null) {
// 			let iframe = document.getElementById("i_container");
// 			if (iframe != null) {
// 				if (!isBattleRoyale) {
// 					iframe.src = "";
// 				} else {
// 					// TODO
// 				}
// 			}
// 		}
// 	}
// }

// function setDisable(cond) {
// 	function setAll(cond1, cond2) {
// 		switchCovergeButton.style.backgroundColor = cond1;
// 		switchCovergeButton.disabled = cond2;

// 		timeMachineBtn.style.backgroundColor = cond1;
// 		timeMachineBtn.disabled = cond2;
// 	}

// 	function setMapstyle(cond1, cond2) {
// 		for (let mapDiv of document.getElementsByClassName("preset-minimap")) {
// 			if (mapDiv.id == "Borders" || mapDiv.id == "Satellite" || mapDiv.id == "Terrain" || mapDiv.id == "Hybrid" || mapDiv.id == "Custom") {
// 				mapDiv.style.backgroundColor = cond1;
// 				mapDiv.disabled = cond2;
// 			}
// 		}
// 		for (let mapDiv2 of document.getElementsByClassName("overlay-minimap")) {
// 			if (mapDiv2.id == "Coverage" || mapDiv2.id == "Official") {
// 				mapDiv2.style.backgroundColor = cond1;
// 				mapDiv2.disabled = cond2;
// 			}
// 		}
// 	}

// if (teleportBtn != null) {
// 	if (rtded) {
// 		setAll("red", true);
// 		setMapstyle("red", true);
// 	} else {
// 		setMapstyle("#ff69b4", false);
// 		if (cond == "NMPZ") {
// 			setAll("red", true);
// 			timeMachineBtn.style.backgroundColor = "#BF40BF";
// 			timeMachineBtn.disabled = false;
// 		} else if (cond == "Google") {
// 			setAll("#BF40BF", false);
// 		} else if (nextPlayer === "Baidu" || nextPlayer === "Youtube" || nextPlayer === "Image") {
// 			setAll("red", true);
// 			switchCovergeButton.style.backgroundColor = "#BF40BF";
// 			switchCovergeButton.disabled = false;
// 		} else if (cond == "Kakao" || cond == "Yandex" || cond == "Mapillary" || cond == "MS Streetside") {
// 			setAll("#BF40BF", false);
// 			timeMachineBtn.style.backgroundColor = "red";
// 			timeMachineBtn.disabled = true;
// 		} else if (cond == "MS Satellite") {
// 			setAll("red", true);
// 		}
// 	}
// 	timeMachineNewerBtn.style.backgroundColor = "red";
// 	timeMachineNewerBtn.disabled = true;
// 	timeMachineOlderBtn.style.backgroundColor = "red";
// 	timeMachineOlderBtn.disabled = true;
// }
// }

/**
 * This observer stays alive while the script is running
 */

function launchObserver() {
	UnityInitiate();
	// SyncListener();
	console.log("Main Observer");
	const OBSERVER = new MutationObserver((mutations, observer) => {
		detectGamePage();
	});
	observerCallback(OBSERVER);
}
function observerCallback(obs) {
	if (obs) {
		obs.observe(document.head, { attributes: true, childList: true, subtree: true });
	} else {
		setTimeout(observerCallback, 250);
	}
}

/**
 * Once the Google Maps API was loaded we can do more stuff
 */

window.addEventListener("DOMContentLoaded", (event) => {
	injecter(() => {
		launchObserver();
	});
});

const base62 = {
	charset: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
	encode: (integer) => {
		if (integer === 0) {
			return 0;
		}
		let s = [];
		while (integer > 0) {
			s = [base62.charset[integer % 62], ...s];
			integer = Math.floor(integer / 62);
		}
		return s.join("");
	},
	decode: (chars) =>
		chars
			.split("")
			.reverse()
			.reduce((prev, curr, i) => prev + base62.charset.indexOf(curr) * 62 ** i, 0),
};

/**
 * Check whether the current page is a game, if so which game mode
 */

function detectGamePage() {
	if (document.querySelector(".game-layout__panorama-message") !== null && !one_reset) {
		one_reset = true;
		console.log("Hide fail to load panorama canvas");
		document.querySelector(".game-layout__panorama-message").style.visibility = "hidden";
	}
	function loadModule() {
		if (toLoad) {
			initializeCanvas();
		}
		waitLoad();
	}
	let toLoad =
		!playerLoaded &&
		!YandexPlayer &&
		!KakaoPlayer &&
		!MapillaryPlayer &&
		!MSStreetPlayer &&
		!YANDEX_INJECTED &&
		!KAKAO_INJECTED &&
		!MAPILLARY_INJECTED &&
		!MS_INJECTED;
	const PATHNAME = window.location.pathname;
	if (PATHNAME.startsWith("/game/") || PATHNAME.startsWith("/challenge/")) {
		// console.log("Game page");
		isBattleRoyale = false;
		isDuel = false;
		loadModule();
	} else if (PATHNAME.startsWith("/battle-royale/")) {
		if (document.querySelector(".br-game-layout") == null) {
			// console.log("Battle Royale Lobby");
			rstValues();
		} else {
			// console.log("Battle Royale");
			isBattleRoyale = true;
			isDuel = false;
			loadModule();
		}
	} else if (PATHNAME.startsWith("/duels/") || PATHNAME.startsWith("/team-duels/")) {
		if (document.querySelector(".game_layout__TO_jf") == null) {
			// console.log("Battle Royale Lobby");
			rstValues();
		} else {
			// console.log("Duels");
			isBattleRoyale = true;
			isDuel = true;
			loadModule();
		}
	} else if (PATHNAME.startsWith("/bullseye/")) {
		if (document.querySelector(".game_layout__0vAWj") == null) {
			// console.log("Battle Royale Lobby");
			rstValues();
		} else {
			//             console.log("bullseye");
			isBattleRoyale = true;
			isBullseye = true;
			loadModule();
		}
	} else {
		rstValues();
		//console.log("Not a Game page");
	}
}

function rstValues() {
	ROUND = 0;
	YandexPlayer = null;
	KakaoPlayer = null;
	MapillaryPlayer = null;
	MSStreetPlayer = null;

	BAIDU_INJECTED = false;
	YANDEX_INJECTED = false;
	KAKAO_INJECTED = false;
	MAPILLARY_INJECTED = false;
	MS_INJECTED = false;

	nextPlayer = "Google";
	global_lat = 0;
	global_lng = 0;
	global_panoID = null;
	global_BDAh = null;
	global_BDBh = null;
	global_BDID = null;
	yId = null;
	yTime = null;
	yEnd = null;
	iId = null;

	COMPASS = null;
	eventListenerAttached = false;
	povListenerAttached = false;
	playerLoaded = false;
	locHistory = [];
	one_reset = false;
	// setHidden(true);
	yandex_map = false;
	Kakao_map = false;
	mmKey = 0;
	CURRENT_ROUND_DATA = null;
	ms_radius = 10000;

	isDuel = false;
	isBattleRoyale = false;
	isBullseye = false;

	BR_LOAD_KAKAO = false;
	BR_LOAD_YANDEX = false;
	BR_LOAD_MS = false;

	ms_sat_map = false;
	rtded = false;

	linksList = [];

	NM = false;
	NP = false;
	NZ = false;
}

/**
 * Wait for various players to load
 */

function waitLoad() {
	if (!YandexPlayer || !KakaoPlayer || !MapillaryPlayer || !MSStreetPlayer || !YANDEX_INJECTED || !KAKAO_INJECTED || !MAPILLARY_INJECTED || !MS_INJECTED) {
		setTimeout(waitLoad, 250);
	} else {
		checkRound();
	}
}

/**
 * Checks for round changes
 */

function checkRound() {
	if (!isBattleRoyale) {
		// console.log("Check Round");
		let currentRound = getRoundFromPage();
		if (ROUND != currentRound) {
			fire1 = true;
			console.log("New round");
			ROUND = currentRound;
			// NEW_ROUND_LOADED = true;
			COMPASS = null;
			locHistory = [];
			one_reset = false;
			getMapData();
			nextButtonCallback();
		}
	} else {
		getMapData();
	}
}

/**
 * Add listeners if buttons have been created
 */

function finalDetail() {
	let target = document.querySelector("a[data-qa='play-same-map']");
	if (target) {
		var div = document.createElement("div");
		div.classList.add("buttons_buttons__0B3SB");
		document.querySelector(".result-layout_content__jAHfP").appendChild(div);
		for (var rd of linksList) {
			// console.log(rd)
			let cl = target.cloneNode(true);
			let tx = "View R" + rd[0] + " in " + rd[1];
			cl.querySelector(".button_label__kpJrA").innerHTML = tx;
			cl.removeAttribute("data-qa");
			cl.removeAttribute("href");
			cl.urlStr = rd[2];
			cl.addEventListener("click", (e) => {
				window.open(cl.urlStr);
			});
			cl.style = "top:10px;right:-10px;";
			div.appendChild(cl);
		}
	} else {
		setTimeout(finalDetail, 500);
	}
}

function nextButtonCallback() {
	let nextButton = document.querySelector("button[data-qa='close-round-result']");
	if (nextButton != null && fire1) {
		fire1 = false;
		nextButton.addEventListener("click", (e) => {
			if (ROUND == 5) {
				console.log("Game Finished");
				if (linksList) {
					finalDetail();
				}
			}
		});
		let urlStr = "";

		if (nextPlayer !== "Google") {
			console.log("Clone buttons");
			let clone = document.querySelector("button[data-qa='close-round-result']").cloneNode(true);
			let tx = "View Location in " + nextPlayer;
			clone.querySelector(".button_label__kpJrA").innerHTML = tx;
			clone.setAttribute("id", "LinkBtn");
			clone.removeAttribute("data-qa");
			if (nextPlayer == "Baidu") {
				urlStr = "https://map.baidu.com/?panotype=street&pid=" + global_BDID + "&panoid=" + global_BDID + "&from=api";
			} else if (nextPlayer == "Youtube") {
				urlStr = "https://www.youtube.com/watch?v=" + yId;
			} else if (nextPlayer == "Image") {
				urlStr = iId;
			} else if (nextPlayer == "Kakao") {
				urlStr = "https://map.kakao.com/link/roadview/" + global_lat + "," + global_lng;
			} else if (nextPlayer == "Mapillary") {
				urlStr = "https://www.mapillary.com/app/?pKey=" + mmKey + "&focus=photo";
			} else if (nextPlayer == "Yandex") {
				urlStr = "https://yandex.com/maps/?&panorama%5Bdirection%5D=16%2C0&panorama%5Bpoint%5D=" + global_lng + "%2C" + global_lat;
			} else if (nextPlayer == "MS Satellite" || nextPlayer == "MS Streetside") {
				urlStr = "https://bing.com/maps/default.aspx?cp=" + global_lat + "~" + global_lng + "&lvl=20&style=r";
			}
			clone.addEventListener("click", (e) => {
				window.open(urlStr);
			});
			if (ROUND == 5) {
				clone.style = "top:10px;";
			} else {
				clone.style = "right:-10px;";
			}
			linksList.push([ROUND, nextPlayer, urlStr]);
			document.querySelector(".round-result_actions__5j26U").appendChild(clone);
		}
	} else {
		setTimeout(nextButtonCallback, 500);
	}
}

// function guessButtonCallback() {
// 	let guessButton = document.querySelector("button[data-qa='perform-guess']");
// 	if (guessButton != null) {
// 		guessButton.addEventListener("click", (e) => {
// 			if (mainMenuBtn != null) {
// 				console.log("try to hide show buttons");
// 				mainMenuBtn.style.visibility = "hidden";
// 				setHidden(true);
// 			}
// 		});
// 	} else {
// 		setTimeout(guessButtonCallback, 500);
// 	}
// }

/**
 * Load different streetview players
 */

function loaderChecker(data) {
	//  console.log(data);
	if (data.includes("A United World") || data.includes("A Unity World") || data.includes("Unity Test")) {
		console.log("Complete Map");
		data = "Yandex Bing Streetside Kakao";
	}

	if (data.includes("Yandex")) {
		console.log("Yandex Map");
		yandex_map = true;
		injectYandexScript()
			.then(() => {
				console.log("Ready to inject Yandex player");
				injectYandexPlayer();
			})
			.catch((error) => {
				console.log(error);
			});
		BR_LOAD_YANDEX = true;
	} else {
		console.log("Not Yandex map");
		YANDEX_INJECTED = true;
		YandexPlayer = "YD";
	}

	if (data.includes("Bing Streetside")) {
		console.log("Bing Streetside Map");
		injectMSPlayer();
		BR_LOAD_MS = true;
	} else if (satelliteMode) {
		ms_sat_map = true;

		ms_radius = tempRad * 1000;

		injectMSPlayer();
		BR_LOAD_MS = true;
	} else {
		console.log("Not Bing map");
		MS_INJECTED = true;
		MSStreetPlayer = "MS";
	}

	if (data.includes("Kakao")) {
		console.log("Kakao Map");
		Kakao_map = true;
		injectKakaoScript()
			.then(() => {
				console.log("Ready to inject Kakao player");
			})
			.catch((error) => {
				console.log(error);
			});
		BR_LOAD_KAKAO = true;
	} else {
		KAKAO_INJECTED = true;
		KakaoPlayer = "KK";
		console.log("Not Kakao map");
	}

	if (!data.includes("China Tips for each province")) {
		cn_tips = false;
		// setHidden(false);
	} else {
		cn_tips = true;
		guaranteeUI();
	}
}

function loadPlayers() {
	playerLoaded = true;
	injectContainer();
	getSeed()
		.then((data) => {
			// console.log(data)
			let map_name = "Default";
			if (typeof data.isRated !== "undefined") {
				rtded = data.isRated;
			}
			if (rtded) {
				map_name = "Public Game";
			} else {
				if (!isBattleRoyale) {
					map_name = data.mapName;
				} else {
					if (isBullseye) {
						map_name = data.mapName;
					} else if (isDuel) {
						map_name = data.options.map.name;
					} else {
						map_name = "Unity Test";
					}
				}
			}
			loaderChecker(map_name);
		})
		.catch((error) => {
			console.log(error);
		});
}

function guaranteeUI() {
	// console.log("UI")
	if (document.getElementById("GH-ui") !== null) {
		document.getElementById("GH-ui").style.display = "block";
	} else {
		setTimeout(guaranteeUI, 500);
	}
}

/**
 * Handles Return to start and undo
 */

function handleReturnToStart() {
	let rtsButton = document.querySelector("button[data-qa='return-to-start']");
	console.log("Handle Return to start");
	rtsButton.addEventListener("click", (e) => {
		if (nextPlayer !== "Baidu") {
			goToLocation();
		} else {
			document.getElementById("i_container").src = "https://map.baidu.com/?panotype=street&pid=" + global_BDID + "&panoid=" + global_BDID + "&from=api";
		}
		const elementClicked = e.target;
		elementClicked.setAttribute("listener", "true");
		console.log("Return to start");
	});
	guessButtonCallback();
	// setTimeout(function () {goToLocation();}, 1000);
}

function handleUndo() {
	let undoButton = document.querySelector("button[data-qa='undo-move']");
	console.log("Handle undo");
	undoButton.addEventListener("click", (e) => {
		if (locHistory.length > 0) {
			goToUndoMove();
			console.log("Undo Move");
		}
	});
}

/**
 * Load game information
 */

function getMapData() {
	// myHighlight("Seed data");

	function modularget(data) {
		locationCheck(data);
		if (data.currentRoundNumber == 1 && nextPlayer == "Kakao") {
			setTimeout(function () {
				goToLocation();
			}, 3000);
		} else {
			goToLocation();
		}

		// handleMinimapCallback();
		// handleButtons();
	}
	getSeed()
		.then((data) => {
			// myHighlight("Seed data");
			// console.log(data);

			modularget(data);
		})
		.catch((error) => {
			console.log(error);
		});
}
/**
 * Check which player to use for the next location
 */

function locationCheck(data) {
	// console.log(data);
	let round;

	round = data.rounds[data.round - 1];
	global_lat = round.lat;
	global_lng = round.lng;
	global_panoID = round.panoId;
	global_heading = round.heading;
	global_pitch = round.pitch;

	nextPlayer = "Google";

	if (ms_sat_map) {
		nextPlayer = "MS Satellite";
	}

	if (global_panoID) {
		let locInfo;

		locInfo = hex2a(global_panoID);

		//         console.log(locInfo)
		if (locInfo.substring(0, 3) == "YTB") {
			nextPlayer = "Youtube";
			let lengths = [3, 11, 4, 4];
			let toPiece = lengths.map(
				(
					(p) => (i) =>
						locInfo.slice(p, (p += i))
				)(0)
			);
			let fullID = locInfo.substring(3).split("START");
			yId = toPiece[1];
			yTime = Number(toPiece[2]);
			yEnd = Number(toPiece[3]);
		} else {
			let mapType = locInfo.substring(0, 5);

			// panoId unchanged

			if (mapType === "YDMAP") {
				nextPlayer = "Yandex";
			} else if (mapType === "KKMAP") {
				nextPlayer = "Kakao";
			}

			// New panoId formats
			else if (mapType === "BAIDU") {
				nextPlayer = "Baidu";
				let lengths = [5, 7, 7, 3];
				let toPiece = lengths.map(
					(
						(p) => (i) =>
							locInfo.slice(p, (p += i))
					)(0)
				);
				let panoId1 = base62.decode(toPiece[1]).toString().substring(1);
				let panoId2 = base62.decode(toPiece[2]).toString().substring(1);
				global_BDID = panoId1 + panoId2 + toPiece[3];
			} else if (mapType === "MAPIL") {
				nextPlayer = "Mapillary";
				mmKey = locInfo.substring(5).replace(/\D/g, "");
			} else if (mapType === "IMAGE") {
				nextPlayer = "Image";
				let lengths = [5, 4, 4, 7, 2];
				let toPiece = lengths.map(
					(
						(p) => (i) =>
							locInfo.slice(p, (p += i))
					)(0)
				);
				iId = "https://i.ibb.co/" + toPiece[3] + "/" + toPiece[1] + "." + toPiece[2].replace(/[^0-9a-z]/gi, "");
			} else if (mapType === "BINGM") {
				nextPlayer = "MS Streetside";
			} else if (mapType === "SATEL") {
				nextPlayer = "MS Satellite";
				ms_radius = parseInt(locInfo.substring(5).replace(/\D/g, "")) * 1000;
			}

			// legacy panoId formats support
			else if (mapType === "BDMAP") {
				nextPlayer = "Baidu";
				let coord = locInfo.substring(5);

				if (coord.includes("BDAh")) {
					global_BDID = coord.split("BDAh")[0].replace("panoId", "");
					let tem = coord.split("BDAh")[1];
					global_BDAh = tem.split("BDBh")[0];
					global_BDBh = tem.split("BDBh")[1];
				} else {
					global_BDID = coord.replace("panoId", "");
				}
			} else if (mapType === "MLMAP") {
				nextPlayer = "Mapillary";
				mmKey = locInfo.substring(5);
			}
		}
	} else {
		if (Kakao_map) {
			nextPlayer = "Kakao";
		} else if (yandex_map) {
			nextPlayer = "Yandex";
		}
	}

	console.log(nextPlayer);
	injectCanvas();
}

/**
 * setID for canvas
 */

function initializeCanvas() {
	let GAME_CANVAS = "";
	let DUEL_CANVAS = "";

	GAME_CANVAS = document.querySelector(".game-layout__canvas");
	DUEL_CANVAS = "dummy";
	if (GAME_CANVAS && DUEL_CANVAS) {
		GAME_CANVAS.id = "player";

		partialCreateMapillary = typeof mapillary !== typeof undefined;
		partialCreateYandex = typeof ymaps !== typeof undefined;
		partialCreateKakao = typeof kakao !== typeof undefined;
		partialCreateMS = typeof Microsoft !== typeof undefined;
		loadPlayers();
		injectMapillaryPlayer();
	} else {
		setTimeout(initializeCanvas, 250);
	}
}

/**
 * Hide or show players based on where the next location is
 */

function injectCanvas() {
	Google();
	Baidu();
	if (BR_LOAD_KAKAO) {
		Kakao();
	}
	if (BR_LOAD_YANDEX) {
		Yandex();
	}
	if (BR_LOAD_MS) {
		Bing();
	}
	Mapillary();
}

// for duels (class ID change)

function canvasSwitch() {
	let GOOGLE_MAPS_CANVAS = document.querySelector(".game-panorama_panoramaCanvas__PNKve");
	let BAIDU_MAPS_CANVAS = document.getElementById("i_container");
	let KAKAO_MAPS_CANVAS = document.getElementById("roadview");
	let YANDEX_MAPS_CANVAS = document.querySelector(".ymaps-2-1-79-panorama-screen");
	let BING_MAPS_CANVAS = document.getElementById("ms-player");
	let MAPILLARY_MAPS_CANVAS = document.getElementById("mapillary-player");

	if (
		GOOGLE_MAPS_CANVAS &&
		BAIDU_MAPS_CANVAS &&
		MAPILLARY_MAPS_CANVAS &&
		(!BR_LOAD_KAKAO || KAKAO_MAPS_CANVAS) &&
		(!BR_LOAD_MS || BING_MAPS_CANVAS) &&
		(!BR_LOAD_YANDEX || YANDEX_MAPS_CANVAS)
	) {
		document.getElementById("default_player").style.position = "absolute";
		document.getElementById("default_player").className = "inactive";
		BAIDU_MAPS_CANVAS.style.position = "absolute";
		BAIDU_MAPS_CANVAS.className = "inactive";
		MAPILLARY_MAPS_CANVAS.style.visibility = "hidden";
		MAPILLARY_MAPS_CANVAS.style.position = "absolute";
		MAPILLARY_MAPS_CANVAS.className = "inactive";
		if (BR_LOAD_KAKAO) {
			KAKAO_MAPS_CANVAS.style.position = "absolute";
			KAKAO_MAPS_CANVAS.className = "inactive";
		}
		if (BR_LOAD_YANDEX) {
			YANDEX_MAPS_CANVAS.style.visibility = "hidden";
			YANDEX_MAPS_CANVAS.style.position = "absolute";
		}
		if (BR_LOAD_MS) {
			BING_MAPS_CANVAS.style.position = "absolute";
			BING_MAPS_CANVAS.className = "inactive";
		}
		switchCovergeButton.nextPlayer = nextPlayer;
		switchCovergeButton.useGoogle = false;

		if (nextPlayer === "Google") {
			document.getElementById("default_player").className = "game-panorama_panoramaCanvas__PNKve";
			switchCovergeButton.useGoogle = true;
			console.log("Google Duel Canvas loaded");
		} else if (nextPlayer === "Baidu" || nextPlayer === "Youtube" || nextPlayer === "Image") {
			BAIDU_MAPS_CANVAS.className = "game-panorama_panorama__rdhFg";
			console.log("Container Duel Canvas loaded");
		} else if (nextPlayer === "Kakao") {
			if (BR_LOAD_KAKAO) {
				KAKAO_MAPS_CANVAS.className = "game-panorama_panorama__rdhFg";
			}
			console.log("Kakao Duel Canvas loaded");
		} else if (nextPlayer === "Yandex") {
			if (BR_LOAD_YANDEX) {
				YANDEX_MAPS_CANVAS.style.visibility = "";
			}
			console.log("Yandex Duel Canvas loaded");
		} else if (nextPlayer === "Mapillary") {
			MAPILLARY_MAPS_CANVAS.style.visibility = "";
			MAPILLARY_MAPS_CANVAS.className = "game-panorama_panorama__rdhFg";
			// MapillaryPlayer.resize();
			console.log("Mapillary Duel Canvas loaded");
		} else if (nextPlayer === "MS Streetside" || nextPlayer === "MS Satellite") {
			if (BR_LOAD_MS) {
				BING_MAPS_CANVAS.className = "game-panorama_panorama__rdhFg";
			}
			console.log("MS Duel Canvas loaded");
		}
	} else {
		setTimeout(canvasSwitch, 250);
	}
}

// for Battle Royale and classic (change visibility)

function Google() {
	let GOOGLE_MAPS_CANVAS = "";
	if (isBattleRoyale) {
		if (!isBullseye) {
			GOOGLE_MAPS_CANVAS = document.querySelector(".br-game-layout__panorama-canvas");
		} else {
			GOOGLE_MAPS_CANVAS = document.querySelector(".game-panorama_panoramaCanvas__r_5ea");
		}
	} else {
		GOOGLE_MAPS_CANVAS = document.querySelector(".game-layout__panorama-canvas");
	}
	if (nextPlayer === "Google") {
		GOOGLE_MAPS_CANVAS.style.visibility = "";
		switchCovergeButton.nextPlayer = "Google";
		switchCovergeButton.useGoogle = true;
		console.log("Google Canvas loaded");
	} else {
		GOOGLE_MAPS_CANVAS.style.visibility = "hidden";
		// console.log("Google Canvas hidden");
	}
}

function Baidu() {
	let BAIDU_MAPS_CANVAS = document.getElementById("i_container");
	// console.log("Baidu canvas");
	if (BAIDU_MAPS_CANVAS !== null) {
		BAIDU_MAPS_CANVAS.style.position = "absolute";
		if (nextPlayer === "Baidu" || nextPlayer === "Youtube" || nextPlayer === "Image") {
			BAIDU_MAPS_CANVAS.style.visibility = "";
			// switchCovergeButton.nextPlayer = "Baidu";
			// switchCovergeButton.useGoogle = false;
			console.log("Container Canvas loaded");
		} else {
			BAIDU_MAPS_CANVAS.style.visibility = "hidden";
			// console.log("Container Canvas hidden");
		}
	} else {
		setTimeout(Baidu, 250);
	}
}

function Kakao() {
	let KAKAO_MAPS_CANVAS = document.getElementById("roadview");
	// console.log("Kakao canvas");
	if (KAKAO_MAPS_CANVAS != null) {
		KAKAO_MAPS_CANVAS.style.position = "absolute";
		if (nextPlayer === "Kakao") {
			KAKAO_MAPS_CANVAS.style.visibility = "";
			switchCovergeButton.nextPlayer = "Kakao";
			switchCovergeButton.useGoogle = false;
			console.log("Kakao Canvas loaded");
		} else {
			KAKAO_MAPS_CANVAS.style.visibility = "hidden";
			// console.log("Kakao Canvas hidden");
		}
	} else {
		setTimeout(Kakao, 250);
	}
}

function Yandex() {
	let YANDEX_MAPS_CANVAS = document.querySelector(".ymaps-2-1-79-panorama-screen");
	if (YANDEX_MAPS_CANVAS != null) {
		if (isBullseye) {
			let div = document.getElementById("player");
			YANDEX_MAPS_CANVAS.classList.add("game-panorama_panorama__ncMwh");
			div.prepend(YANDEX_MAPS_CANVAS);
		}
		// console.log("Yandex canvas");
		document.querySelector(".ymaps-2-1-79-panorama-screen").style.position = "absolute";
		// console.log("Yandex canvas");
		/*   console.log(YANDEX_MAPS_CANVAS); */
		if (nextPlayer === "Yandex") {
			YANDEX_MAPS_CANVAS.style.visibility = "";
			switchCovergeButton.nextPlayer = "Yandex";
			switchCovergeButton.useGoogle = false;
			console.log("Yandex Canvas loaded");
		} else {
			YANDEX_MAPS_CANVAS.style.visibility = "hidden";
			// console.log("Yandex Canvas hidden");
		}
	} else {
		setTimeout(Yandex, 250);
	}
}

function Mapillary() {
	let MAPILLARY_MAPS_CANVAS = document.getElementById("mapillary-player");
	if (MAPILLARY_MAPS_CANVAS != null) {
		// console.log("Mapillary canvas");
		MAPILLARY_MAPS_CANVAS.style.position = "absolute";
		if (nextPlayer === "Mapillary") {
			MAPILLARY_MAPS_CANVAS.style.visibility = "";
			switchCovergeButton.nextPlayer = "Mapillary";
			switchCovergeButton.useGoogle = false;
			console.log("Mapillary Canvas loaded");
		} else {
			MAPILLARY_MAPS_CANVAS.style.visibility = "hidden";
			// console.log("Mapillary Canvas hidden");
		}
	} else {
		setTimeout(Mapillary, 250);
	}
}

function Bing() {
	let BING_MAPS_CANVAS = document.getElementById("ms-player");
	if (BING_MAPS_CANVAS != null) {
		// console.log("Mapillary canvas");
		BING_MAPS_CANVAS.style.position = "absolute";
		if (nextPlayer === "MS Satellite" || nextPlayer === "MS Streetside") {
			BING_MAPS_CANVAS.style.visibility = "";
			// switchCovergeButton.nextPlayer = nextPlayer;
			// switchCovergeButton.useGoogle = false;
			console.log("Bing Canvas loaded");
		} else {
			BING_MAPS_CANVAS.style.visibility = "hidden";
			// console.log("Bing Canvas hidden");
		}
	} else {
		setTimeout(Bing, 250);
	}
}

/**
 * Adjust button placement
 */

// function ZoomControls() {
// 	let style = `
// 	 .ymaps-2-1-79-panorama-gotoymaps {display: none !important;}
// 	 .ymaps-2-1-79-panorama-control__zoom {top: 2rem !important; left: 2rem !important; z-Index: 0}
// 	 .mapillary-bearing-indicator-container {top: 2rem !important; left: 2rem !important;}
// 	 .mapillary-zoom-container {top: 6rem !important; left: 2.20rem !important;}
// 	 .NavBar_MapTypeButtonContainerWrapper {visibility: hidden !important;}
// 	 .bm_LocateMeControl {visibility: hidden !important;}
// 	 .NavBar_Container {top: -6rem !important; left: 2rem !important;}
// 	 .streetsideToolPanel {top: 4rem !important; left: 2rem !important;}
// 	 `;

// 	let style_element = document.createElement("style");
// 	style_element.innerHTML = style;
// 	document.body.appendChild(style_element);
// 	// document.getElementById("mapillary-bearing-indicator-container").style.top = "20em"
// }

/**
 * Updates the compass to match Yandex Panorama facing
 */
function updateCompass() {
	if (!COMPASS) {
		let compass = document.querySelector("img.compass__indicator");
		if (compass != null) {
			COMPASS = compass;
			let direction = YandexPlayer.getDirection()[0] * -1;
			COMPASS.setAttribute("style", `transform: rotate(${direction}deg);`);
		}
	} else {
		let direction = YandexPlayer.getDirection()[0] * -1;
		COMPASS.setAttribute("style", `transform: rotate(${direction}deg);`);
	}
}

/**
 * Open next location in streetview player given next player and next coordinate
 */

function goToLocation() {
	console.log("Going to location");
	if (nextPlayer === "Yandex") {
		let options = {};
		YandexPlayer.moveTo([global_lat, global_lng], options);
		YandexPlayer.setDirection([0, 16]);
		YandexPlayer.setSpan([10, 67]);
	} else if (nextPlayer === "Baidu" || nextPlayer === "Youtube" || nextPlayer === "Image") {
		if (document.getElementById("i_container") !== null) {
			let iframe = document.getElementById("i_container");
			if (nextPlayer === "Baidu") {
				if (!isFirefox) {
					iframe.style.top = "-60px";
					iframe.style.height = window.innerHeight + 200 + "px";
				} else {
					iframe.style.top = "-60px";
					iframe.style.height = window.innerHeight + 219 + "px";
				}

				if (!isFirefox) {
					iframe.style.right = "-55px";
					iframe.style.width = window.innerWidth + 55 + "px";
				} else {
					iframe.style.right = "-15px";
					iframe.style.width = window.innerWidth + 15 + "px";
				}
				let urlStr2 = "https://map.baidu.com/?panotype=street&pid=" + global_BDID + "&panoid=" + global_BDID + "&from=api";
				let urlStr =
					"https://map.baidu.com/@" +
					global_BDAh +
					"," +
					global_BDBh +
					"#panoid=" +
					global_BDID +
					"&panotype=street&l=12&tn=B_NORMAL_MAP&sc=0&newmap=1&shareurl=1&pid=" +
					global_BDID;
				// console.log(urlStr)
				if (global_BDAh != null) {
					iframe.src = urlStr;
				} else {
					iframe.src = urlStr2;
				}
				iframe.style.visibility = "";
			} else if (nextPlayer === "Youtube") {
				document.getElementById("Youtube Button").style.visibility = "";
				document.getElementById("Youtube Button").innerHTML = "Play video";
				iframe.allow = "autoplay";
				iframe.style.visibility = "hidden";
				iframe.style.top = "-60px";
				iframe.style.height = window.innerHeight + 235 + "px";
			} else if (nextPlayer === "Image") {
				iframe.style.top = "0px";
				iframe.style.height = window.innerHeight + "px";
				iframe.style.visibility = "";
				iframe.src = iId;
			}
		} else {
			setTimeout(goToLocation, 250);
		}
		//         let a = new BMap.Point(global_lng, global_lat);
		//         BaiduPlayer.setPov({ heading: -40, pitch: 6 });
		//         BaiduPlayer.setPosition(a);
	} else if (nextPlayer === "Kakao") {
		var roadviewClient = new kakao.maps.RoadviewClient();
		var position = new kakao.maps.LatLng(global_lat, global_lng);
		roadviewClient.getNearestPanoId(position, 500, function (panoId) {
			KakaoPlayer.setPanoId(panoId, position);
			KakaoPlayer.setViewpoint({ pan: global_heading, tilt: global_pitch, zoom: -3 });
		});
	} else if (nextPlayer === "Mapillary") {
		MapillaryPlayer.resize();
		MapillaryPlayer.moveTo(mmKey).then(
			(image) => {
				//console.log(image);
			},
			(error) => {
				console.log(error);
			}
		);
	} else if (nextPlayer === "Google") {
		handleMapillary({ lat: global_lat, lng: global_lng }, { meters: 500, limit: 500 });
	} else if (nextPlayer === "MS Streetside") {
		MSStreetPlayer.setView({
			mapTypeId: Microsoft.Maps.MapTypeId.streetside,
			zoom: 18,
			streetsideOptions: {
				overviewMapMode: Microsoft.Maps.OverviewMapMode.hidden,
				showCurrentAddress: false,
				showProblemReporting: false,
				showExitButton: false,
			},
			center: new Microsoft.Maps.Location(global_lat, global_lng),
			heading: 90,
			pitch: -30,
			disableStreetside: false,
		});
	} else if (nextPlayer === "MS Satellite") {
		// console.log("MS Satellite Player")
		let ctr = new Microsoft.Maps.Location(global_lat, global_lng);
		let loc_centre = { lat: global_lat, lng: global_lng };
		for (var i = MSStreetPlayer.entities.getLength() - 1; i >= 0; i--) {
			var pushpin = MSStreetPlayer.entities.get(i);
			if (pushpin instanceof Microsoft.Maps.Pushpin) {
				MSStreetPlayer.entities.removeAt(i);
			}
		}
		let latlngBounds = getBBox2(loc_centre, ms_radius);
		// console.log(latlngBounds)
		let bounds = Microsoft.Maps.LocationRect.fromLocations(
			new Microsoft.Maps.Location(latlngBounds[0], latlngBounds[1]),
			new Microsoft.Maps.Location(latlngBounds[2], latlngBounds[3])
		);
		// console.log(bounds)
		MSStreetPlayer.setOptions({ maxBounds: bounds });
		MSStreetPlayer.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial, labelOverlay: Microsoft.Maps.LabelOverlay.hidden, center: ctr, zoom: 15 });
		var pin = new Microsoft.Maps.Pushpin(ctr, {});

		//Add the pushpin to the map
		MSStreetPlayer.entities.push(pin);
		// hideNav();
	}
	// switchCovergeButton.lat = global_lat;
	// switchCovergeButton.lng = global_lng;
}

/**
 * Handle undo using the location history of the current round
 */

function goToUndoMove(data) {
	/*   console.log(global_lat);
	   console.log(global_lng); */
	let options = {};
	let prevStep = null;
	if (locHistory.length === 1) {
		prevStep = locHistory[0];
	} else {
		prevStep = locHistory.pop();
	}
	// console.log(prevStep);
	// console.log(locHistory)
	if (nextPlayer === "Yandex") {
		defaultPanoIdChange = false;
		YandexPlayer.moveTo([prevStep[0], prevStep[1]], options);
		YandexPlayer.setDirection([prevStep[2], prevStep[3]]);
		YandexPlayer.setSpan([10, 67]);
		switchCovergeButton.lat = prevStep[0];
		switchCovergeButton.lng = prevStep[1];
	} else if (nextPlayer === "Kakao") {
		let btn = document.querySelector("button[data-qa='undo-move']");
		btn.disabled = false;
		btn.classList.remove("styles_disabled__2YdHD");
		defaultPanoIdChange = false;
		let position = new kakao.maps.LatLng(prevStep[0], prevStep[1]);
		KakaoPlayer.setPanoId(prevStep[2], position);
		switchCovergeButton.lat = prevStep[0];
		switchCovergeButton.lng = prevStep[1];
		switchCovergeButton.useGoogle = false;
	} else if (nextPlayer === "Mapillary") {
		MapillaryPlayer.moveTo(prevStep[2]).then(
			(image) => {
				//console.log(image);
				switchCovergeButton.lat = prevStep[1];
				switchCovergeButton.lng = prevStep[0];
			},
			(error) => {
				console.log(error);
			}
		);
	} else if (nextPlayer === "MS Streetside") {
		defaultPanoIdChange = false;
		// console.log(locHistory);
		MSStreetPlayer.setView({ center: new Microsoft.Maps.Location(prevStep[0], prevStep[1]) });
		switchCovergeButton.lat = prevStep[0];
		switchCovergeButton.lng = prevStep[1];
		switchCovergeButton.heading = prevStep[2];
	}
}

function SyncListener() {
	switchCovergeButton.addEventListener("click", () => {
		if (switchCovergeButton.useGoogle == false) {
			// switchCovergeButton.useGoogle = true;
			console.log(switchCovergeButton.nextPlayer);
			if (switchCovergeButton.nextPlayer === "Yandex") {
				let options = {};
				YandexPlayer.moveTo([switchCovergeButton.lat, switchCovergeButton.lng], options);
				YandexPlayer.setDirection([switchCovergeButton.heading, 0]);

				// switchCovergeButton.nextPlayer = "Yandex";
			} else if (switchCovergeButton.nextPlayer === "Kakao") {
				let roadviewClient = new kakao.maps.RoadviewClient();
				// console.log(switchCovergeButton.lat);
				let position = new kakao.maps.LatLng(switchCovergeButton.lat, switchCovergeButton.lng);
				roadviewClient.getNearestPanoId(position, 500, function (panoId) {
					KakaoPlayer.setPanoId(panoId, position);
				});
				KakaoPlayer.setViewpoint({
					pan: switchCovergeButton.heading,
					tilt: 0,
					zoom: -3,
				});
				// switchCovergeButton.nextPlayer = "Kakao";
			} else if (switchCovergeButton.nextPlayer === "Mapillary" || switchCovergeButton.nextPlayer === "Google") {
				// switchCovergeButton.nextPlayer = "Kakao";
				handleMapillary({ lat: switchCovergeButton.lat, lng: switchCovergeButton.lng }, { meters: 100, limit: 100 });
			} else if (switchCovergeButton.nextPlayer === "MS Streetside") {
				let bounds = new Microsoft.Maps.LocationRect(new Microsoft.Maps.Location(switchCovergeButton.lat, switchCovergeButton.lng), 0.01, 0.01);
				Microsoft.Maps.Map.getClosestPanorama(bounds, onSuccess, onMissingCoverage);
				function onSuccess(panoramaInfo) {
					MSStreetPlayer.setView({ center: new Microsoft.Maps.Location(panoramaInfo.la, panoramaInfo.lo), heading: switchCovergeButton.heading });
				}
				function onMissingCoverage() {
					console.log("No Coverage");
				}
			}
		}
	});
}

/**
 * Gets the seed data for the current game
 *
 * @returns Promise with seed data as object
 */
function getSeed() {
	// console.log("getSeed called");
	return new Promise((resolve, reject) => {
		let token = getToken();
		let URL;
		let cred = "";

		const PATHNAME = window.location.pathname;

		if (PATHNAME.startsWith("/game/")) {
			URL = `https://www.geoguessr.com/api/v3/games/${token}`;
		} else if (PATHNAME.startsWith("/challenge/")) {
			URL = `https://www.geoguessr.com/api/v3/challenges/${token}/game`;
		} else if (PATHNAME.startsWith("/battle-royale/")) {
			URL = `https://game-server.geoguessr.com/api/battle-royale/${token}`;
		} else if (PATHNAME.startsWith("/duels/") || PATHNAME.startsWith("/team-duels/")) {
			URL = `https://game-server.geoguessr.com/api/duels/${token}`;
		} else if (PATHNAME.startsWith("/bullseye/")) {
			URL = `https://game-server.geoguessr.com/api/bullseye/${token}`;
		}
		if (isBattleRoyale) {
			fetch(URL, {
				// Include credentials to GET from the endpoint
				credentials: "include",
			})
				.then((response) => response.json())
				.then((data) => {
					resolve(data);
				})
				.catch((error) => {
					reject(error);
				});
		} else {
			fetch(URL)
				.then((response) => response.json())
				.then((data) => {
					resolve(data);
				})
				.catch((error) => {
					reject(error);
				});
		}
	});
}

/**
 * Gets the token from the current URL
 *
 * @returns token
 */
function getToken() {
	const PATHNAME = window.location.pathname;
	if (PATHNAME.startsWith("/game/")) {
		return PATHNAME.replace("/game/", "");
	} else if (PATHNAME.startsWith("/challenge/")) {
		return PATHNAME.replace("/challenge/", "");
	} else if (PATHNAME.startsWith("/battle-royale/")) {
		return PATHNAME.replace("/battle-royale/", "");
	} else if (PATHNAME.startsWith("/duels/")) {
		return PATHNAME.replace("/duels/", "");
	} else if (PATHNAME.startsWith("/team-duels/")) {
		return PATHNAME.replace("/team-duels/", "");
	} else if (PATHNAME.startsWith("/bullseye/")) {
		return PATHNAME.replace("/bullseye/", "");
	}
}

/**
 * Gets the round number from the ongoing game from the page itself
 *
 * @returns Round number
 */
function getRoundFromPage() {
	const roundData = document.querySelector("div[data-qa='round-number']");
	if (roundData) {
		let roundElement = roundData.querySelector("div:last-child");
		if (roundElement) {
			let round = parseInt(roundElement.innerText.charAt(0));
			if (!isNaN(round) && round >= 1 && round <= 5) {
				return round;
			}
		}
	} else {
		return ROUND;
	}
}

/**
 * Injects Yandex Script
 */
function injectYandexScript() {
	return new Promise((resolve, reject) => {
		if (!YANDEX_INJECTED) {
			if (YANDEX_API_KEY === "") {
				console.log("No Yandex Key");
				reject();
			} else {
				if (!partialCreateYandex) {
					const SCRIPT = document.createElement("script");
					SCRIPT.type = "text/javascript";
					SCRIPT.async = true;
					SCRIPT.src = `https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=${YANDEX_API_KEY}`;
					document.body.appendChild(SCRIPT);
					SCRIPT.onload = () => {
						ymaps.ready(() => {
							YANDEX_INJECTED = true;
							myHighlight("Yandex API Loaded");
							resolve();
						});
					};
				} else {
					YANDEX_INJECTED = true;
					resolve();
				}
			}
		} else {
			resolve();
		}
	});
}

/**
 * Injects Yandex Player and calls handleReturnToStart
 */
function injectYandexPlayer() {
	let lat = 41.321861;
	let lng = 69.21292;

	let options = {
		direction: [0, 16],
		span: [10, 67],
		controls: ["zoomControl"],
	};
	ymaps.panorama.createPlayer("player", [lat, lng], options).done((player) => {
		YandexPlayer = player;
		YandexPlayer.events.add("directionchange", (e) => {
			updateCompass();
			let pov = YandexPlayer.getDirection();
			if (locHistory.length > 0 && nextPlayer == "Yandex") {
				switchCovergeButton.heading = pov[0];
				locHistory[locHistory.length - 1][2] = pov[0];
				locHistory[locHistory.length - 1][3] = pov[1];
			}
		});
		YandexPlayer.events.add("panoramachange", (e) => {
			if (defaultPanoIdChange) {
				let num = YandexPlayer.getPanorama().getPosition();
				let pov = YandexPlayer.getDirection();
				if (nextPlayer == "Yandex") {
					locHistory.push([num[0], num[1], pov[0], pov[1]]);
					switchCovergeButton.lat = num[0];
					switchCovergeButton.lng = num[1];
				}
				let btn = document.querySelector("button[data-qa='undo-move']");
				if (locHistory.length > 1) {
					btn.disabled = false;
					btn.classList.remove("styles_disabled__2YdHD");
				}
			}
			defaultPanoIdChange = true;
		});
		console.log("Yandex Player injected");
	});
}

/**
 * Injects Baidu script
 */

function reportWindowSize() {
	let iframeC = document.getElementById("i_container");
	if (iframeC) {
		if (nextPlayer == "Baidu") {
			iframeC.style.top = "-60px";
			iframeC.style.height = window.innerHeight + 200 + "px";
			iframeC.style.right = "-55px";
			iframeC.style.width = window.innerWidth + 55 + "px";
		} else if (nextPlayer == "Youtube") {
			iframeC.style.top = "-60px";
			iframeC.style.height = window.innerHeight + 235 + "px";
		} else if (nextPlayer == "Image") {
			iframeC.style.top = "0px";
			iframeC.style.height = window.innerHeight + "px";
		}
	}
}

window.onresize = reportWindowSize;

function injectContainer() {
	myHighlight("iframe container loaded");
	const iframe = document.createElement("iframe");
	iframe.frameBorder = 0;
	iframe.style.position = "absolute";
	iframe.id = "i_container";
	if (isBattleRoyale) {
		if (isDuel) {
			iframe.className = "inactive";
		} else if (isBullseye) {
			iframe.className = "game-panorama_panorama__ncMwh";
		} else {
			iframe.className = "br-game-layout__panorama";
		}
	} else {
		iframe.className = "game-layout__panorama";
	}
	var div = document.getElementById("player");
	div.style.overflow = "hidden";
	if (isBullseye) {
		div.prepend(iframe);
	} else {
		div.appendChild(iframe);
	}
}

// function injectMedia() {
//     myHighlight("Baidu API loaded")
//     const iframe = document.createElement('iframe');
//     iframe.allow = "autoplay"
//     iframe.src = "https://www.youtube.com/embed/72kRM86V-dw?&autoplay=1&modestbranding=1&controls=0&start=10"
//     iframe.frameBorder = 0;
//     iframe.style.position = "absolute";
//     iframe.id = "media-player";
//     iframe.style="position:fixed; top: -60px; left:0; bottom: calc(100% + 175px); right:0; width:100%; height:calc(100% + 235px); border:none; margin:0; padding:0; overflow:hidden; z-index:999999;"
//     if (isBattleRoyale) {
//         if (isDuel)
//         {
//             iframe.className = "inactive"
//         }
//         else
//         {
//             iframe.className = "br-game-layout__panorama"
//         }
//     }
//     else {
//         iframe.className = "game-layout__panorama"
//     }
//     var div = document.getElementById("player");
//     div.style.overflow = "hidden";
//     div.appendChild(iframe);
// }

/**
 * Injects Kakao script
 */

function injectKakaoScript() {
	return new Promise((resolve, reject) => {
		if (!KAKAO_INJECTED) {
			if (KAKAO_API_KEY === "") {
				console.log("No Kakao Key");
			} else {
				let canvas = document.createElement("kmap");

				var div = document.getElementById("player");

				div.appendChild(canvas);

				let SCRIPT;
				if (!partialCreateKakao) {
					SCRIPT = document.createElement("script");
					SCRIPT.async = true;
					SCRIPT.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`;
					document.body.appendChild(SCRIPT);
				}

				function drawmapKakao() {
					kakao.maps.load(function () {
						var position = new kakao.maps.LatLng(33.450701, 126.560667);
						let roadviewContainer = document.getElementById("roadview");
						KakaoPlayer = new kakao.maps.Roadview(roadviewContainer);
						var panoId = 1023434522;
						KakaoPlayer.setPanoId(panoId, position);
						KAKAO_INJECTED = true;
						// Remove the compass from Kakao
						kakao.maps.event.addListener(KakaoPlayer, "init", () => {
							const compassContainer = roadviewContainer.querySelector('div[id*="_box_util_"]');
							if (compassContainer) compassContainer.style.display = "none";
						});
						kakao.maps.event.addListener(KakaoPlayer, "panoid_changed", function () {
							if (defaultPanoIdChange && KakaoPlayer) {
								let latlng = KakaoPlayer.getPosition();
								let lat = latlng.getLat();
								let lng = latlng.getLng();
								let pID = KakaoPlayer.getViewpointWithPanoId();
								if (nextPlayer == "Kakao" && lat != 33.45047613915499) {
									// console.log("push");
									locHistory.push([lat, lng, pID.panoId, pID.pan]);
									switchCovergeButton.lat = lat;
									switchCovergeButton.lng = lng;
									switchCovergeButton.heading = pID.pan;
								}
								let btn = document.querySelector("button[data-qa='undo-move']");
								if (locHistory.length > 1 && btn != null) {
									btn.disabled = false;
									btn.classList.remove("styles_disabled__2YdHD");
								}
							}
							defaultPanoIdChange = true;
						});
						kakao.maps.event.addListener(KakaoPlayer, "viewpoint_changed", function () {
							// console.log("pov_listener attached");
							let pID = KakaoPlayer.getViewpointWithPanoId();
							if (locHistory.length > 0 && nextPlayer == "Kakao") {
								switchCovergeButton.heading = pID.pan;
								locHistory[locHistory.length - 1][3] = pID.pan;
							}
							if (GooglePlayer) {
								const { heading, pitch } = GooglePlayer.getPov();
								if ((!almostEqual(pID.pan, heading) || !almostEqual(pID.tilt, pitch)) && nextPlayer == "Kakao") {
									// Updating the google street view POV will update the compass
									GooglePlayer.setPov({ heading: pID.pan, pitch: pID.tilt });
								}
							}
							// console.log(locHistory);
						});
					});
				}

				if (partialCreateKakao) {
					drawmapKakao();
				} else {
					SCRIPT.onload = () => {
						drawmapKakao();
						myHighlight("Kakao API Loaded");
						resolve();
					};
				}
			}
		} else {
			resolve();
		}
	});
}

function injectMSPlayer() {
	return new Promise((resolve, reject) => {
		if (!MS_INJECTED) {
			if (MS_API_KEY === "") {
				let canvas = document.getElementById("player");
				console.log("No MS Key");
			} else {
				let SCRIPT;
				if (!partialCreateMS) {
					SCRIPT = document.createElement("script");
					SCRIPT.type = "text/javascript";
					SCRIPT.async = true;
					SCRIPT.src = `https://www.bing.com/api/maps/mapcontrol?key=${MS_API_KEY}`;
					document.body.appendChild(SCRIPT);
				}
				let canvas = document.createElement("msmap");
				if (isBattleRoyale) {
					if (isDuel) {
						canvas.innerHTML = `<div id="ms-player" class="inactive" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					} else if (isBullseye) {
						canvas.innerHTML = `<div id="ms-player" class="game-panorama_panorama__ncMwh" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					} else {
						canvas.innerHTML = `<div id="ms-player" class="br-game-layout__panorama" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					}
				} else {
					canvas.innerHTML = `<div id="ms-player" class="game-layout__panorama" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
				}

				var div = document.getElementById("player");
				if (isBullseye) {
					div.prepend(canvas);
				} else {
					div.appendChild(canvas);
				}

				function drawmapMS() {
					MSStreetPlayer = new Microsoft.Maps.Map(document.getElementById("ms-player"), { disableStreetsideAutoCoverage: true });
					MS_INJECTED = true;
					Microsoft.Maps.Events.addHandler(MSStreetPlayer, "viewchange", function () {
						updateView(MSStreetPlayer);
					});
					function updateView(map) {
						let ctrm = map.getCenter();
						if (nextPlayer == "MS Streetside" && switchCovergeButton.lat !== ctrm.latitude && switchCovergeButton.lng !== ctrm.longitude) {
							let heading2 = bearing(switchCovergeButton.lat, switchCovergeButton.lng, ctrm.latitude, ctrm.longitude);
							locHistory.push([ctrm.latitude, ctrm.longitude, heading2]);
							switchCovergeButton.lat = ctrm.latitude;
							switchCovergeButton.lng = ctrm.longitude;
							switchCovergeButton.heading = heading2;
							let btn = document.querySelector("button[data-qa='undo-move']");
							if (locHistory.length > 1 && btn != null) {
								btn.disabled = false;
								btn.classList.remove("styles_disabled__2YdHD");
							}
						}
					}
				}

				if (partialCreateMS) {
					drawmapMS();
				} else {
					SCRIPT.addEventListener("load", () => {
						myHighlight("Bing Maps API loaded");
						let timeout = 0;
						let interval = setInterval(() => {
							if (timeout >= 40) {
								reject();
								clearInterval(interval);
							}
							if (document.getElementById("ms-player") !== null && typeof Microsoft.Maps.Map !== typeof undefined) {
								drawmapMS();
								resolve();
								clearInterval(interval);
							}
							timeout += 1;
						}, 1000);
					});
				}
			}
		} else {
			resolve();
		}
	});
}

function injectMapillaryPlayer() {
	return new Promise((resolve, reject) => {
		if (!MAPILLARY_INJECTED) {
			if (MAPILLARY_API_KEY === "") {
				let canvas = document.getElementById("player");
				console.log("No Mapillary Key");
			} else {
				let SCRIPT;
				if (!partialCreateMapillary) {
					SCRIPT = document.createElement("script");
					SCRIPT.type = "text/javascript";
					SCRIPT.async = true;
					SCRIPT.src = `https://unpkg.com/mapillary-js@4.0.0/dist/mapillary.js`;
					document.body.appendChild(SCRIPT);
					document.querySelector("head").innerHTML += '<link href="https://unpkg.com/mapillary-js@4.0.0/dist/mapillary.css" rel="stylesheet"/>';
				}
				let canvas = document.createElement("mmap");
				if (isBattleRoyale) {
					if (isDuel) {
						canvas.innerHTML = `<div id="mapillary-player" class="inactive" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					} else if (isBullseye) {
						canvas.innerHTML = `<div id="mapillary-player" class="game-panorama_panorama__ncMwh" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					} else {
						canvas.innerHTML = `<div id="mapillary-player" class="br-game-layout__panorama" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
					}
				} else {
					canvas.innerHTML = `<div id="mapillary-player" class="game-layout__panorama" style="zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'"></div>`;
				}

				var div = document.getElementById("player");
				if (isBullseye) {
					div.prepend(canvas);
				} else {
					div.appendChild(canvas);
				}

				function drawMapML() {
					var { Viewer } = mapillary;

					MapillaryPlayer = new Viewer({
						accessToken: MAPILLARY_API_KEY,
						container: "mapillary-player", // the ID of our container defined in the HTML body
					});

					MapillaryPlayer.on("image", async (event) => {
						let image = event.image;
						let pos = image.originalLngLat;
						let cond = true;
						for (const element of locHistory) {
							if (element[2] == image.id) {
								cond = false;
							}
						}
						if (cond) {
							switchCovergeButton.lat = pos.lat;
							switchCovergeButton.lng = pos.lng;
							switchCovergeButton.heading = image.compassAngle;
							// console.log(pos);
							locHistory.push([pos.lat, pos.lng, image.id, image.compassAngle]);
						}
						let btn = document.querySelector("button[data-qa='undo-move']");
						if (btn !== null && locHistory.length > 1) {
							btn.disabled = false;
							btn.classList.remove("styles_disabled__2YdHD");
						}
					});

					MAPILLARY_INJECTED = true;
				}
				if (partialCreateMapillary) {
					drawMapML();
				} else {
					SCRIPT.addEventListener("load", () => {
						myHighlight("Mapillary API Loaded");
						// resolve(BMap);
						drawMapML();
						resolve();
					});
				}
			}
		} else {
			resolve();
		}
	});
}

function handleMapillary(latlng, options) {
	console.log("handleMapillary");
	handleMapillaryHelper(latlng, options)
		.then((data) => {
			let idToSet = 0;
			let curDist = 100000000;
			for (const element of data.data) {
				// console.log(element)
				if (element.hasOwnProperty("computed_geometry")) {
					try {
						let rCord = element.computed_geometry["coordinates"];
						let dist = distance(latlng.lat, latlng.lng, rCord[1], rCord[0]);
						if (dist < curDist) {
							idToSet = element.id;
							curDist = dist;
						}
					} catch (e) {
						console.log("Error");
					}
				}
			}
			if (idToSet !== 0) {
				MapillaryPlayer.moveTo(idToSet).then(
					(image) => {
						//console.log(image);
					},
					(error) => {
						console.log(error);
					}
				);
			}
		})
		.catch((error) => {
			console.log(error);
		});
}

function handleMapillaryHelper(latlng, options) {
	return new Promise((resolve, reject) => {
		// console.log("1")
		let bbox = getBBox(latlng, options.meters);
		let URL = "https://graph.mapillary.com/images?access_token={0}&fields=id,computed_geometry&bbox={1}&limit={2}"
			.replace("{0}", MAPILLARY_API_KEY)
			.replace("{1}", bbox)
			.replace("{2}", options.limit);
		fetch(URL)
			.then((response) => {
				resolve(response.json());
			})
			.catch((error) => {
				console.log(error);
			});
	});
}
