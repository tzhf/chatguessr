const hastebin = require("hastebin.js");
const haste = new hastebin();

class Hastebin {
	/**
	 * @param  {Object[]} scores
	 * @param  {string} mapName
	 * @return {Promise} link
	 */
	static makeHastebin = (mapName, scores, locations) => {
		let str = `# ${mapName} Highscores :
${"-".repeat(mapName.length + 13)}
`;
		scores.forEach((score, index) => {
			str += `
${index + 1}.${index + 1 < 10 ? "  " : " "}${score.username}${" ".repeat(30 - score.username.length)}${" ".repeat(5 - score.score.toString().length)}${score.score} [${
				score.guessedRounds
			}]`;
		});

		str += `

${"-".repeat(43)}`;

		locations.forEach((location, index) => {
			const url = `maps.google.com/maps?q=&layer=c&cbll=${location.lat},${location.lng}`;

			str += `

Round ${index + 1}:
${url}
${"-".repeat(url.length)}`;
		});

		return haste.post(str).then((link) => link);
	};
}

module.exports = Hastebin;
