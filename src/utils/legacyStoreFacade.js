// This file handles storing things in BOTH the old JSON storage
// and in sqlite. Once everything is moved to sqlite we can get rid of this.

const Store = require('./Store');

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
    const user = Store.getOrCreateUser(username, displayName);

    if (!dbUser) {
        dbUser = db.migrateUser(userId, displayName, user);
    }

    return { user, dbUser };
}

/**
 * @param {Database} db
 * @param {{ id: string }} dbUser
 * @param {import('../Classes/User')} user
 * @param {string} flag
 */
function setUserFlag (db, dbUser, user, flag) {
    user.setFlag(flag ?? '');
    Store.saveUser(user.user, user);
    if (dbUser) {
        db.setUserFlag(dbUser.id, flag);
    }
}

/**
 * @param {Database} db
 * @param {{ id: string }} dbUser
 * @param {import('../Classes/User')} user
 * @param {string} roundId
 */
function addUserStreak(db, dbUser, user, roundId) {
    user.addStreak();
    db.addUserStreak(dbUser.id, roundId);
}

/**
 * @param {Database} db
 * @param {{ id: string }} dbUser
 * @param {import('../Classes/User')} user
 */
function resetUserStreak(db, dbUser, user) {
    user.setStreak(0);
    db.resetUserStreak(dbUser.id);
}

module.exports = { getOrMigrateUser, setUserFlag, addUserStreak, resetUserStreak };