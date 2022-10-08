"use strict";

const Database = require("./Database");

/** @type {Database} */
let db;

beforeEach(() => {
	db = new Database(":memory:");
});

describe("getUserStats", () => {
	it("counts victories", () => {
		const user = db.getOrCreateUser("1234567", "libreanna");
		const token = "testgame";
		db.createGame(/** @type {any} */ ({
			token,
			map: "test",
			mapName: "test",
			bounds: {
				min: { lat: 0, lng: 0 },
				max: { lat: 0, lng: 0 },
			},
			forbidMoving: true,
			forbidRotating: false,
			forbidZooming: false,
			timeLimit: 0,
		}));
		const createGuess = () => {
			const roundId = db.createRound(token, {
				lat: 0,
				lng: 0,
				panoId: null,
				heading: 0,
				pitch: 0,
				zoom: 0,
				streakLocationCode: null,
			});
			db.createGuess(roundId, user.id, {
				color: "#fff",
				flag: "jo",
				location: { lat: 0, lng: 0 },
				country: null,
				streak: 0,
				distance: 0,
				score: 5000,
			});
		};

		for (let i = 0; i < 5; i += 1) {
			createGuess();
		}

		// Now on round 5: this should not yet be counted as a victory
		expect(db.getUserStats(user.id).victories).toEqual(0);

		db.finishGame(token);

		// Only once the game is finished, it counts.
		expect(db.getUserStats(user.id).victories).toEqual(1);
	});
});
