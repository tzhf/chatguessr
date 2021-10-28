'use strict';

// This file handles storing things in BOTH the old JSON storage
// and in sqlite. Once everything is moved to sqlite we can get rid of this.

const store = require('./sharedStore');

/** @typedef {import('./Database')} Database */

/**
 * 
 * @param {Database} db 
 * @param {string} userId
 * @param {string} username
 * @param {string} displayName
 */
function getOrMigrateUser(db, userId, username, displayName) {
    let dbUser = db.getUser(userId);
    /** @type {import('./sharedStore').LegacyUser} */
    const user = store.get(`users.${username}`);

    if (!dbUser && user) {
        dbUser = db.migrateUser(userId, displayName, user);
        // Deleting users from the store loses historical stats (as read by other functions in this file)
        // so we should NOT enable this line.
        // store.delete(`users.${username}`);
    } else {
        dbUser = db.getOrCreateUser(userId, displayName);
    }

    return { user, dbUser };
}

/**
 * Get combined top scoring stats from the database and the old JSON store.
 * 
 * TODO(reanna) we don't *properly* combine stats from the DB and from the JSON store.
 * It just picks whichever score is higher, while for perfects and victories, the
 * stats from the JSON store should first be *added* to the DB stats, before we can
 * pick the highest one. This would be doable by migrating the JSON stats into a separate
 * table in the DB that we can query. Stats can only be migrated for active users since
 * we need to know their twitch user ID.
 * 
 * @param {Database} db 
 */
function getGlobalStats(db) {
    const stats = db.getGlobalStats();
    const allUsers = store.get('users');

    // If there is no legacy data, we don't need to account for it
    if (!allUsers || Object.keys(allUsers).length === 0) {
        return stats;
    }

    let streak = undefined;
    let perfects = undefined;
    let victories = undefined;
    for (const user of Object.values(allUsers)) {
        if (!streak || user.bestStreak > streak.streak) {
            streak = { id: user.user, username: user.username, streak: user.bestStreak };
        }
        if (!perfects || user.perfects > perfects.perfects) {
            perfects = { id: user.user, username: user.username, perfects: user.perfects };
        }
        if (!victories || user.victories > victories.victories) {
            victories = { id: user.user, username: user.username, victories: user.victories };
        }
    }

    if (!streak || stats.streak && stats.streak.streak > streak.streak) {
        streak = stats.streak;
    }
    if (!perfects || stats.perfects && stats.perfects.perfects > perfects.perfects) {
        perfects = stats.perfects;
    }
    if (!victories || stats.victories && stats.victories.victories > victories.victories) {
        victories = stats.victories;
    }

    return { streak, perfects, victories };
}

/**
 * Get combined user stats from the database and the old JSON based store.
 * 
 * @param {Database} db
 * @param {string} userId
 * @param {string} username
 * @returns {ReturnType<import('./Database')['getUserStats']>}
 */
function getUserStats(db, userId, username) {
    const userInfo = db.getUserStats(userId);
    /** @type {import('./sharedStore').LegacyUser} */
    const legacyUserInfo = store.get(`users.${username}`)
    if (!userInfo) {
        return legacyUserInfo;
    }
    if (!legacyUserInfo) {
        return userInfo;
    }

    let { bestStreak, correctGuesses, nbGuesses, meanScore, victories, perfects } = userInfo;
    bestStreak = Math.max(bestStreak, legacyUserInfo.bestStreak);
    correctGuesses += legacyUserInfo.correctGuesses;
    nbGuesses += legacyUserInfo.nbGuesses;
    meanScore = (legacyUserInfo.meanScore * legacyUserInfo.nbGuesses + userInfo.meanScore * userInfo.nbGuesses) / nbGuesses;
    victories += legacyUserInfo.victories;
    perfects += legacyUserInfo.perfects;

    return {
        ...userInfo,
        bestStreak,
        correctGuesses,
        nbGuesses,
        meanScore,
        victories,
        perfects,
    };
}

module.exports = { getOrMigrateUser, getGlobalStats, getUserStats };