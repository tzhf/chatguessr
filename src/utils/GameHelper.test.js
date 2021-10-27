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
		expect(
			GameHelper.parseCoordinates("-30.12345, -50.54321")
		)
		.toBeTruthy();
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