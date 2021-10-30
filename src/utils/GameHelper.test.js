'use strict';

const GameHelper = require("./GameHelper");

describe('parseCoordinates', () => {
	it("Checks if '30.12345, 50.54321' are valid coordinates >> true", () => {
		expect(
			GameHelper.parseCoordinates("30.12345, 50.54321")
		)
		.toBeTruthy();
	});
	it("Checks if '30.12345,50.54321' are valid coordinates >> true", () => {
		expect(
			GameHelper.parseCoordinates("30.12345,50.54321")
		)
		.toBeTruthy();
	});
	it("Checks if '-30.12345, -50.54321' are valid coordinates >> true", () => {
		const { lat, lng } = GameHelper.parseCoordinates("-30.12345, -50.54321")
		expect(lat).toBeCloseTo(-30.12345, 4);
		expect(lng).toBeCloseTo(-50.54321, 4);
	});
	it("Checks if '-30.12345,-50.54321' are valid coordinates >> true", () => {
		expect(
			GameHelper.parseCoordinates("-30.12345,-50.54321")
		)
		.toBeTruthy();
	});
	it("Checks if '95.12345, 50.54321' are invalid coordinates >> false", () => {
		expect(
			GameHelper.parseCoordinates("95.12345, 50.54321")
		)
		.toBeFalsy();
	});
	it("Checks if '30.12345, 190.54321' are invalid coordinates >> false", () => {
		expect(
			GameHelper.parseCoordinates("30.12345, 190.54321")
		)
		.toBeFalsy();
	});
});