'use strict';

const Database = require('./Database');
/** @type {import('./sharedStore') & { setData: (object: any) => void }} */
const store = (/** @type {any} */ (require('./sharedStore')));
const { getOrMigrateUser, getGlobalStats, getUserStats } = require('./legacyStoreFacade');

jest.mock('./sharedStore');

/** @type {Database} */
let db;

beforeEach(() => {
    db = new Database(':memory:');
    store.setData({});
});

describe('getOrMigrateUser', () => {
    it('creates a new user', () => {
        const { user, dbUser } = getOrMigrateUser(db, '1234567', 'libreanna', 'LibReAnna');
        expect(user).toBeNull();
        expect(dbUser).toMatchObject({
            id: '1234567',
            username: 'LibReAnna',
        });
    });

    it('returns a user that already exists', () => {
        db.getOrCreateUser('1234567', 'LibReAnna');

        const { user, dbUser } = getOrMigrateUser(db, '1234567', 'libreanna', 'LibReAnna');
        expect(user).toBeNull();
        expect(dbUser).toMatchObject({
            id: '1234567',
            username: 'LibReAnna',
        });
    });

    it('migrates flag setting from the json store', () => {
        store.setData({
            users: {
                libreanna: {
                    user: 'libreanna',
                    flag: 'jo',
                },
            },
        });

        const { user, dbUser } = getOrMigrateUser(db, '1234567', 'libreanna', 'LibReAnna');
        expect(user).toMatchObject({
            flag: 'jo',
        });
        expect(dbUser).toMatchObject({
            id: '1234567',
            username: 'LibReAnna',
            flag: 'jo',
        });
    });
});

describe('getGlobalStats', () => {
    beforeEach(() => {
        db.getOrCreateUser('1234567', 'LibReAnna');
        db.getOrCreateUser('1234568', 'fran_stan');
        db.getGlobalStats = () => ({
            streak: { id: '1234567', username: 'LibReAnna', streak: 10 },
            victories: { id: '1234568', username: 'fran_stan', victories: 7 },
            perfects: { id: '1234567', username: 'LibReAnna', perfects: 2 },
        });
    });

    it('returns db stats', () => {
        expect(getGlobalStats(db)).toEqual({
            streak: { id: '1234567', username: 'LibReAnna', streak: 10 },
            victories: { id: '1234568', username: 'fran_stan', victories: 7 },
            perfects: { id: '1234567', username: 'LibReAnna', perfects: 2 },
        });
    });

    it('accounts for stats from the json store', () => {
        store.setData({
            users: {
                libreanna: {
                    user: 'libreanna',
                    username: 'LibReAnna',
                    bestStreak: 9,
                    victories: 4,
                    perfects: 0,
                },
                fran_stan: {
                    user: 'fran_stan',
                    username: 'fran_stan',
                    bestStreak: 11,
                    victories: 3,
                    perfects: 1,
                },
            },
        });
        expect(getGlobalStats(db)).toEqual({
            streak: { id: 'fran_stan', username: 'fran_stan', streak: 11 },
            victories: { id: '1234568', username: 'fran_stan', victories: 7 },
            perfects: { id: '1234567', username: 'LibReAnna', perfects: 2 },
        });
    });
});
