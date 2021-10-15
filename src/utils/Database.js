const SQLite = require('@paulrosania/better-sqlite3');
const { randomUUID } = require('crypto');

/** @typedef {import('../types').LatLng} LatLng */

function timestamp() {
    return Math.floor(Date.now() / 1000);
}

/** @type {((db: SQLite.Database) => void)[]} */
const migrations = [
    function initialSetup(db) {
        const usersTable = db.prepare(`CREATE TABLE users (
            -- Twitch user ID
            id TEXT PRIMARY KEY NOT NULL,
            -- Twitch display name
            username TEXT NOT NULL,
            flag TEXT DEFAULT NULL,
            previous_guess TEXT DEFAULT NULL,
            last_location TEXT DEFAULT NULL,
            reset_at INT DEFAULT 0
        )`);

        const gamesTable = db.prepare(`CREATE TABLE games (
            -- GeoGuessr game token
            id TEXT PRIMARY KEY NOT NULL,
            map TEXT NOT NULL,
            map_name TEXT NOT NULL,
            -- JSON bounds: {min: LatLng, max: LatLng}
            -- for the scoring formula
            map_bounds TEXT NOT NULL,
            -- boolean 0 or 1
            forbid_moving INT NOT NULL,
            -- boolean 0 or 1
            forbid_panning INT NOT NULL,
            -- boolean 0 or 1
            forbid_zooming INT NOT NULL,
            -- in seconds
            time_limit INT DEFAULT NULL,
            created_at INT NOT NULL
        )`);

        const roundsTable = db.prepare(`CREATE TABLE rounds (
            -- UUID
            id TEXT PRIMARY KEY NOT NULL,
            game_id TEXT NOT NULL,
            -- JSON coordinates {lat,lng,heading,pitch}
            location TEXT NOT NULL,
            -- Country code of the location
            country TEXT DEFAULT NULL,
            created_at INT NOT NULL,

            FOREIGN KEY(game_id) REFERENCES games(id)
        )`);

        const guessesTable = db.prepare(`CREATE TABLE guesses (
            -- UUID
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            round_id TEXT NOT NULL,
            -- User color at the time the guess was made.
            color TEXT DEFAULT NULL,
            -- User flag at the time the guess was made.
            flag TEXT DEFAULT NULL,
            -- JSON coordinates {lat,lng}
            location TEXT NOT NULL,
            -- Country code where the guess was placed
            country TEXT DEFAULT NULL,
            streak INT DEFAULT 0,
            -- Distance (in metres?), slightly inaccurate
            distance INT NOT NULL,
            score INT NOT NULL,
            created_at INT NOT NULL,

            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(round_id) REFERENCES rounds(id)
        )`);

        usersTable.run();
        gamesTable.run();
        roundsTable.run();
        guessesTable.run();

        // These are all deriveable … maybe add them later if it is useful
        /*
        ALTER TABLE users ADD COLUMN streak INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN best_streak INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN correct_guesses INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN nb_guesses INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN perfects INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN victories INT DEFAULT 0;
        */
    },
];

class Database {
    /**
     * @param {string} file
     */
    constructor(file) {
        /** @private */
        this.db = new SQLite(file);

        this.migrate();
    }

    /** @private */
    migrateUp() {
        const version = this.db.pragma('user_version', { simple: true });
        if (version < migrations.length) {
            migrations[version](this.db);
            this.db.pragma(`user_version=${version + 1}`);

            return true;
        }
        return false;
    }

    /** @private */
    migrate() {
        let moreMigrations = true;
        while (moreMigrations) {
            moreMigrations = this.migrateUp();
        }
    }

    /**
     * 
     * @param {import('../types').Seed} seed 
     */
    createGame(seed) {
        const insertGame = this.db.prepare(`
            INSERT INTO games(id, map, map_name, map_bounds, forbid_moving, forbid_panning, forbid_zooming, time_limit, created_at)
            VALUES (:id, :map, :mapName, :bounds, :forbidMoving, :forbidPanning, :forbidZooming, :timeLimit, :createdAt)
        `);

        insertGame.run({
            id: seed.token,
            map: seed.map,
            mapName: seed.mapName,
            bounds: JSON.stringify(seed.bounds),
            forbidMoving: seed.forbidMoving ? 1 : 0,
            forbidPanning: seed.forbidRotating ? 1 : 0,
            forbidZooming: seed.forbidZooming ? 1 : 0,
            timeLimit: seed.timeLimit,
            createdAt: timestamp(),
        });
    }

    /**
     * 
     * @param {string} gameId 
     * @returns {string}
     */
    getCurrentRound(gameId) {
        const findRoundId = this.db.prepare(`
            SELECT id
            FROM rounds
            WHERE game_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `).pluck(true);

        return findRoundId.get(gameId);
    }

    /**
     * 
     * @param {string} gameId 
     * @param {import('../types').GameRound} round 
     */
    createRound(gameId, round) {
        const insertRound = this.db.prepare(`
            INSERT INTO rounds(id, game_id, location, created_at)
            VALUES (:id, :gameId, :location, :createdAt)
        `);

        const id = randomUUID();

        insertRound.run({
            id,
            gameId,
            location: JSON.stringify({
                lat: round.lat,
                lng: round.lng,
                heading: round.heading,
                pitch: round.pitch,
            }),
            createdAt: timestamp(),
        });

        return id;
    }

    /**
     * 
     * @param {string} roundId 
     * @param {string} country 
     */
    setRoundCountry(roundId, country) {
        this.db.prepare(`UPDATE rounds SET country = :country WHERE id = :id`).run({
            id: roundId,
            country,
        });
    }

    /**
     * 
     * @param {string} roundId
     * @param {string} userId 
     * @param {{ color: string, flag: string, location: LatLng, country: string | null, streak: number, distance: number, score: number }} guess 
     */
    createGuess(roundId, userId, guess) {
        const id = randomUUID();
        const insertGuess = this.db.prepare(`
            INSERT INTO guesses(id, round_id, user_id, color, flag, location, country, streak, distance, score, created_at)
            VALUES (:id, :roundId, :userId, :color, :flag, :location, :country, :streak, :distance, :score, :createdAt)
        `);

        insertGuess.run({
            id,
            roundId,
            userId,
            color: guess.color,
            flag: guess.flag,
            location: JSON.stringify(guess.location),
            country: guess.country,
            streak: guess.streak,
            distance: guess.distance,
            score: guess.score,
            createdAt: timestamp(),
        });

        return id;
    }

    /**
     * @param {string} roundId
     * @param {string} userId 
     */
    getUserGuess(roundId, userId) {
        const stmt = this.db.prepare('SELECT id, color, flag, location, country, streak, distance, score FROM guesses WHERE round_id = ? AND user_id = ?');
        /** @type {{ id: string, color: string, flag: string, location: string, country: string | null, streak: number, distance: number, score: number } | undefined} */
        const row = stmt.get(roundId, userId);
        if (!row) {
            return;
        }
    
        return {
            ...row,
            /** @type {LatLng} */
            location: JSON.parse(row.location),
        };
    }

    /**
     * @param {string} guessId
     * @param {{ color: string, flag: string, location: LatLng, country: string | null, streak: number, distance: number, score: number }} guess 
     */
    updateGuess(guessId, guess) {
        const updateGuess = this.db.prepare(`
            UPDATE guesses
            SET color = :color, flag = :flag, location = :location, country = :country, streak = :streak, distance = :distance, score = :score
            WHERE id = :id
        `);

        updateGuess.run({
            id: guessId,
            color: guess.color,
            flag: guess.flag,
            location: JSON.stringify(guess.location),
            country: guess.country,
            streak: guess.streak,
            distance: guess.distance,
            score: guess.score,
            // probably not useful but maybe?
            // updatedAt: timestamp(),
        });
    }

    /**
     * 
     * @param {string} guessId 
     * @param {string} country 
     * @param {number} streak
     */
    setGuessCountry(guessId, country, streak) {
        const updateGuess = this.db.prepare(`
            UPDATE guesses
            SET country = :country, streak = :streak
            WHERE id = :id
        `)

        updateGuess.run({
            id: guessId,
            country,
            streak,
        });
    }

    /**
     * Get all the participants for a round, sorted by time. No scores included.
     * 
     * @param {string} roundId 
     */
    getRoundParticipants(roundId) {
        const stmt  = this.db.prepare(`
            SELECT
                guesses.id,
                users.username,
                guesses.color,
                guesses.flag
            FROM guesses, users
            WHERE round_id = ? AND users.id = guesses.user_id
            ORDER BY created_at ASC
        `)

        /** @type {{ id: string, username: string, color: string, flag: string }[]} */
        const records = stmt.all(roundId);
        
        return records;
    }

    /**
     * Get all the guesses for a round, sorted from closest distance to farthest away.
     * 
     * @param {string} roundId 
     */
    getRoundScores(roundId) {
        const stmt = this.db.prepare(`
            SELECT
              guesses.id,
              users.username,
              guesses.color,
              guesses.flag,
              guesses.location,
              guesses.streak,
              guesses.distance,
              guesses.score
            FROM guesses, users
            WHERE round_id = ? AND users.id = guesses.user_id
            ORDER BY distance ASC
        `)

        /** @type {{ id: string, username: string, color: string, flag: string, location: string, streak: number, distance: number, score: number }[]} */
        const records = stmt.all(roundId);

        return records.map((record) => ({
            ...record,
            user: record.username,
            /** @type {LatLng} */
            position: JSON.parse(record.location),
            modified: false,
        }));
    }

    /**
     * 
     * @param {string} gameId 
     */
    getGameScores(gameId) {
        // This sorts the guesses by `created_at` first so that the most recent guess's
        // `streak` value will be used for each player.
        // Ideally we'd do some fancy windowing stuff to calculate the streaks on the fly,
        // but I can't figure that out, so have to settle for this.
        const stmt = this.db.prepare(`
            SELECT users.username,
                   guesses.color,
                   users.flag,
                   guesses.streak,
                   COUNT(guesses.id) AS rounds,
                   SUM(guesses.distance) AS distance,
                   SUM(guesses.score) AS score
            FROM rounds, (
                SELECT * FROM guesses ORDER BY created_at DESC
            ) guesses, users
            WHERE rounds.game_id = ?
              AND guesses.round_id = rounds.id
              AND users.id = guesses.user_id
            GROUP BY guesses.user_id
            ORDER BY score DESC
        `)
        /** @type {{ username: string, color: string, flag: string, streak: number, rounds: number, distance: number, score: number }[]} */
        const records = stmt.all(gameId);

        return records.map((record) => ({
            ...record,
            user: record.username,
        }));
    }

    /**
     * 
     * @param {string} id 
     * @returns {{ id: string, username: string, flag: string, previousGuess: LatLng, lastLocation: LatLng, resetAt: number } | undefined}
     */
    getUser(id) {
        const user = this.db.prepare('SELECT id, username, flag, previous_guess, last_location, reset_at FROM users WHERE id = ?').get(id);

        if (!user) {
            return;
        }

        return {
            id,
            username: user.username,
            flag: user.flag,
            previousGuess: user.previous_guess ? JSON.parse(user.previous_guess) : null,
            lastLocation: user.last_location ? JSON.parse(user.last_location) : null,
            resetAt: user.reset_at * 1000,
        }
    }

    /**
     * 
     * @param {string} userId
     * @param {string} username
     * @param {import('../Classes/User')} storeUser 
     */
    migrateUser(userId, username, storeUser) {
        const migrate = this.db.prepare(`
            INSERT INTO users(id, username, flag, previous_guess, last_location)
            VALUES (:id, :username, :flag, :previousGuess, :lastLocation)
        `);

        migrate.run({
            id: userId,
            username,
            flag: storeUser.flag,
            previousGuess: storeUser.previousGuess ? JSON.stringify(storeUser.previousGuess) : null,
            lastLocation: storeUser.lastLocation ? JSON.stringify(storeUser.lastLocation) : null,
        })

        return this.getUser(userId);
    }

    /**
     * 
     * @param {string} userId 
     * @param {LatLng} lastLocation 
     */
    setUserLastLocation(userId, lastLocation) {
        this.db.prepare(`UPDATE users SET last_location = :lastLocation WHERE id = :id`).run({
            id: userId,
            lastLocation: JSON.stringify(lastLocation),
        })
    }
}

module.exports = Database;