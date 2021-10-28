'use strict';

class MockStore {
    #data;
    constructor (data = {}) {
        this.#data = data;
    }

    setData (data) {
        this.#data = data;
    }

    get (path) {
        return path.split('.').reduce((data, prop) => data?.[prop] ?? null, this.#data);
    }
}

module.exports = new MockStore();