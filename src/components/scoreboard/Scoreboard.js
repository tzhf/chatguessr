const Store = require("electron-store");
const store = new Store();

class Scoreboard {
	constructor(html, css) {
		this.html = html;
		this.css = css;
		this.position;
		this.scoreboardContainer;
		this.scoreboard;
		this.scoreboardTitle;
		this.switchContainer;
		this.switchBtn;
		this.guessList;
		this.init();
	}

	init() {
		this.position = store.get("scoreboard.position", { top: 55, left: 5, width: 390, height: 340 });
		this.scoreboardContainer = document.createElement("div");
		this.scoreboardContainer.setAttribute("id", "scoreboardContainer");
		this.scoreboardContainer.innerHTML = this.html;
		document.body.appendChild(this.scoreboardContainer);

		const style = document.createElement("style");
		style.innerHTML = this.css;
		document.body.appendChild(style);

		this.scoreboardTitle = this.scoreboardContainer.querySelector("#scoreboardTitle");
		this.switchContainer = this.scoreboardContainer.querySelector("#switchContainer");
		this.switchBtn = this.scoreboardContainer.querySelector("#switchBtn");
		this.guessListContainer = this.scoreboardContainer.querySelector("#guessListContainer");
		this.guessList = this.scoreboardContainer.querySelector("#guessList");

		this.scoreboard = $("#scoreboard");
		this.scoreboard.css("top", this.position.top);
		this.scoreboard.css("left", this.position.left);
		this.scoreboard.css("width", this.position.width);
		this.scoreboard.css("height", this.position.height);

		this.scoreboard
			.resizable({
				handles: "n, e, s, w, ne, se, sw, nw",
				containment: "#scoreboardContainer",
			})
			.draggable({
				scroll: true,
				containment: "#scoreboardContainer",
			})
			.mouseup(() => {
				const currentPosition = this.getPosition();
				if (JSON.stringify(this.position) !== JSON.stringify(currentPosition)) {
					this.setPosition(currentPosition);
					store.set("scoreboard.position", currentPosition);
				}
			});

		this.switchBtn.addEventListener("change", () => {
			if (this.switchBtn.checked) {
				ipcRenderer.send("open-guesses");
			} else {
				ipcRenderer.send("close-guesses");
			}
		});
	}

	renderGuess = (guess) => {
		const guessItem = document.createElement("DIV");
		guessItem.className = "guess-item expand";
		guessItem.innerHTML = `
			<span></span>
			<span class="username truncate-long-text" style="color:${guess.color}">${guess.username}</span>
			<span>${guess.streak}</span>
			<span>${this.toMeter(guess.distance)}</span>
			<span>${guess.score}</span>
		`;
		this.guessList.appendChild(guessItem);
	};

	displayScores = (scores, isTotal) => {
		let html = "";
		scores.forEach((guess, index) => {
			const color = index == 0 ? "#FFD700" : index == 1 ? "#C9C9C9" : index == 2 ? "#B27F60" : guess.color;
			html += `
					<div class="guess-item expand">
						<span>${index + 1}</span>
						<span class="username truncate-long-text" style="color:${color}">${guess.username}</span>
						<span>${guess.streak}</span>
						<span>${this.toMeter(guess.distance)}</span>
						<span>${guess.score} ${isTotal ? "[" + guess.nbGuesses + "]" : ""}</span>
					</div>
				`;
		});
		this.guessList.innerHTML = html;
	};

	getPosition = () => ({ top: this.scoreboard.position().top, left: this.scoreboard.position().left, width: this.scoreboard.width(), height: this.scoreboard.height() });
	setPosition = (position) => (this.position = position);
	setTitle = (title) => (this.scoreboardTitle.textContent = title);
	show = (state) => (this.scoreboardContainer.style.display = state ? "block" : "none");
	showSwitch = (state) => (this.switchContainer.style.display = state ? "block" : "none");
	switchOn = (state) => (this.switchBtn.checked = state);
	emptyGuessList = () => (this.guessList.textContent = "");
	toMeter = (distance) => (distance >= 1 ? parseFloat(distance.toFixed(1)) + "km" : parseInt(distance * 1000) + "m");
}
module.exports = Scoreboard;
