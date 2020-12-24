const hastebin = require("hastebin");

class Hastebin {
	/**
	 * @param  {Object[]} scores
	 * @param  {string} mapName
	 * @return {Promise} link
	 */
	static makeHastebin = (mapName, scores, locations) => {
		let str = `# ${"-".repeat(mapName.length + 35)} #
#             ${mapName} Highscores             #
# ${"-".repeat(mapName.length + 35)} #
`;
		scores.forEach((score, index) => {
			str += `
${index + 1}.${index + 1 < 10 ? "  " : " "}${score.username}${" ".repeat(30 - score.username.length)}${" ".repeat(5 - score.score.toString().length)}: ${score.score} [${
				score.guessedRounds
			}]`;
		});

		str += `

${"-".repeat(45)}`;

		locations.forEach((location, index) => {
			const url = `maps.google.com/maps?q=&layer=c&cbll=${location.lat},${location.lng}`;

			str += `

Round ${index + 1}:
${url}
${"-".repeat(url.length)}`;
		});

		return hastebin
			.createPaste(str)
			.then((link) => link)
			.catch((err) => console.log(err));
	};
}

module.exports = Hastebin;
