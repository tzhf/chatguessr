'use strict';

const Database = require('./Database');
/** @type {import('./sharedStore') & { setData: (object: any) => void }} */
const store = (/** @type {any} */ (require('./sharedStore')));
const { getOrMigrateUser } = require('./legacyStoreFacade');

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
