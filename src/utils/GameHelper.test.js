const GameHelper = require("./GameHelper");

// TEST isCoordinates
test("Checks if '30.12345, 50.54321' are valid coordinates >> true", () => {
	expect(
		GameHelper.isCoordinates("30.12345, 50.54321")
	)
	.toBeTruthy();
});
test("Checks if '30.12345,50.54321' are valid coordinates >> true", () => {
	expect(
		GameHelper.isCoordinates("30.12345,50.54321")
	)
	.toBeTruthy();
});
test("Checks if '-30.12345, -50.54321' are valid coordinates >> true", () => {
	expect(
		GameHelper.isCoordinates("-30.12345, -50.54321")
	)
	.toBeTruthy();
});
test("Checks if '-30.12345,-50.54321' are valid coordinates >> true", () => {
	expect(
		GameHelper.isCoordinates("-30.12345,-50.54321")
	)
	.toBeTruthy();
});
test("Checks if '95.12345, 50.54321' are invalid coordinates >> false", () => {
	expect(
		GameHelper.isCoordinates("95.12345, 50.54321")
	)
	.toBeFalsy();
});
test("Checks if '30.12345, 190.54321' are invalid coordinates >> false", () => {
	expect(
		GameHelper.isCoordinates("30.12345, 190.54321")
	)
	.toBeFalsy();
});

// TEST toEmojiFlag
test("Check emoji for 'AR' >> '🇦🇷'", () => {
	expect(
		GameHelper.toEmojiFlag("AR")
	)
	.toBe("🇦🇷");
});



