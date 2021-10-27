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
});