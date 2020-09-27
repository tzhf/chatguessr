const Store = require("../../utils/Store");

class Scoreboard {
	/**
	 * @param  {string} html
	 * @param  {string} css
	 */
	constructor(html, css) {
		this.position;
		this.container;
		this.scoreboard;
		this.title;
		this.switchContainer;
		this.switchBtn;
		this.guessListContainer;
		this.guessList;
		this.isMultiGuess;
		this.init(html, css);
	}

	init(html, css) {
		this.position = Store.getScoreboardPosition({ top: 55, left: 5, width: 390, height: 340 });
		this.container = document.createElement("div");
		this.container.setAttribute("id", "scoreboardContainer");
		this.container.innerHTML = html;
		document.body.appendChild(this.container);

		const style = document.createElement("style");
		style.innerHTML = css;
		document.body.appendChild(style);

		this.title = this.container.querySelector("#scoreboardTitle");
		this.switchContainer = this.container.querySelector("#switchContainer");
		this.switchBtn = this.container.querySelector("#switchBtn");
		this.guessListContainer = this.container.querySelector("#guessListContainer");
		this.guessList = this.container.querySelector("#guessList");

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
					Store.setScoreboardPosition(currentPosition);
				}
			});

		this.switchBtn.addEventListener("change", () => {
			if (this.switchBtn.checked) {
				ipcRenderer.send("open-guesses");
			} else {
				ipcRenderer.send("close-guesses");
			}
		});

		const speed = 60;
		const guessListContainer = this.guessListContainer;
		const guessList = this.guessList;
		let position = guessListContainer.offsetHeight;
		let animateData = requestAnimationFrame(scroller);

		function scroller() {
			if (guessList.offsetHeight > guessListContainer.offsetHeight) {
				position = position - speed / 100;
				const newPos = position + "px";
				guessList.style.marginTop = newPos;

				if (guessList.offsetHeight + position <= 0) {
					position = guessList.offsetHeight;
				}
			} else {
				guessList.style.marginTop = 0;
			}
			animateData = requestAnimationFrame(scroller);
		}
	}

	/**
	 * @param {boolean} isMultiGuess
	 */
	show = (isMultiGuess) => {
		this.isMultiGuess = isMultiGuess;
		this.setMultiGuessStyle();
		this.container.style.display = "block";
	};

	hide = () => (this.container.style.display = "none");

	setMultiGuessStyle = () => {
		const style = document.getElementById("multiGuess");
		if (this.isMultiGuess) {
			if (!style) {
				const style = document.createElement("style");
				style.id = "multiGuess";
				style.innerHTML = `.guess-list-header{display:none;}.guess-item{display:block;}`;
				document.body.appendChild(style);
			}
		} else {
			if (style) style.remove();
		}
	};

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

	renderMultiGuess = (guess) => {
		let guessItem = document.getElementById(`guess-${guess.user}`);
		if (!guessItem) {
			guessItem = document.createElement("DIV");
			guessItem.className = "guess-item expand";
			guessItem.id = `guess-${guess.user}`;
			guessItem.innerHTML = `
				<span class="username truncate-long-text" style="color:${guess.color}">${guess.username}</span>
			`;
			this.guessList.appendChild(guessItem);
		} else {
			guessItem.remove();
			this.guessList.appendChild(guessItem);
		}
	};

	displayScores = (scores, isTotal) => {
		const style = document.getElementById("multiGuess");
		if (style) style.remove();
		let html = "";
		scores.forEach((guess, index) => {
			const color = index == 0 ? "#E3BB39" : index == 1 ? "#C9C9C9" : index == 2 ? "#A3682E" : guess.color;
			html += `
					<div class="guess-item expand">
						<span>${index + 1}</span>
						<span class="username truncate-long-text" style="color:${color}">${guess.username}</span>
						<span>${guess.streak}</span>
						<span>${this.toMeter(guess.distance)}</span>
						<span>${guess.score}${isTotal ? " [" + guess.guessedRounds + "]" : ""}</span>
					</div>
				`;
		});
		this.guessList.innerHTML = html;
	};

	getPosition = () => ({
		top: this.scoreboard.position().top,
		left: this.scoreboard.position().left,
		width: this.scoreboard.width(),
		height: this.scoreboard.height(),
	});

	setPosition = (position) => (this.position = position);

	setTitle = (title) => (this.title.textContent = title);

	showSwitch = (state) => (this.switchContainer.style.display = state ? "block" : "none");

	switchOn = (state) => (this.switchBtn.checked = state);

	emptyGuessList = () => (this.guessList.textContent = "");

	toMeter = (distance) => (distance >= 1 ? parseFloat(distance.toFixed(1)) + "km" : parseInt(distance * 1000) + "m");
}

module.exports = Scoreboard;
