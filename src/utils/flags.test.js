'use strict';

const { getEmoji } = require('./flags');

describe('getEmoji', () => {
    it("Check emoji for 'AR' >> '🇦🇷'", () => {
        expect(getEmoji("AR")).toBe("🇦🇷");
    });
    it("Check emoji for 'GBSCT' >> '🇬🇧 🇸 🇨 🇹'", () => {
        expect(getEmoji("GBSCT")).toBe("🇬🇧 🇸 🇨 🇹");
    });
    it("Check emoji for 'ESCT' >> '🇪🇸 🇨 🇹'", () => {
        expect(getEmoji("ESCT")).toBe("🇪🇸 🇨 🇹");
    });
    it("should not crash with empty flags", () => {
        expect(getEmoji(null)).toBe('');
        expect(getEmoji('')).toBe('');
    });
});
