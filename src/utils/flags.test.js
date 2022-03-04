'use strict';

const flags = require('./flags');

describe('getEmoji', () => {
    it("Check emoji for country flags", () => {
        expect(flags.getEmoji("AR")).toBe("🇦🇷");
        expect(flags.getEmoji("GBSCT")).toBe("🇬🇧 🇸 🇨 🇹");
    });
    it("Check emoji for custom builtin flags", () => {
        expect(flags.getEmoji("ESCT")).toBe("🇪🇸 (CT)");
        expect(flags.getEmoji("LGBT")).toBe("\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08");
    });
    it("should not crash with empty flags", () => {
        expect(flags.getEmoji(null)).toBe('');
        expect(flags.getEmoji('')).toBe('');
    });
});

describe('selectFlag', () => {
	it('supports country/region code input', () => {
		expect(flags.selectFlag('GB')).toBe('gb');
		expect(flags.selectFlag('uk')).toBe('gb');
		expect(flags.selectFlag('SK')).toBe('sk');
		expect(flags.selectFlag('CAqc')).toBe('caqc');
		expect(flags.selectFlag('mySWK')).toBe('myswk');
	});
	it('supports name input', () => {
		expect(flags.selectFlag('Brunei')).toBe('bn');
		expect(flags.selectFlag('korea')).toBe('kr');
		expect(flags.selectFlag('dprk')).toBe('kp');
		expect(flags.selectFlag('England')).toBe('gbeng');
		expect(flags.selectFlag('alabama')).toBe('usal');
	});
});
