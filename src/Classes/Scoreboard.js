// const Store = require("../../utils/Store");

class Scoreboard {
	constructor() {
		this.position;
		this.container;
		this.scoreboard;
		this.title;
		this.switchContainer;
		this.switchBtn;
		this.table;
		this.columnState;
		this.isMultiGuess = false;
		this.isResults = false;
		this.isScrolling = false;
		this.speed = 50;
		this.init();
	}

	init() {
		this.position = getCookie("scoreboard_position", { top: 55, left: 5, width: 380, height: 180 });
		this.container = $("#scoreboardContainer");
		this.title = $("#scoreboardTitle");
		this.switchContainer = $("#switchContainer");
		this.switchBtn = $("#switchBtn");

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
				containment: "#scoreboardContainer",
			})
			.mouseup(() => {
				const currentPosition = this.getPosition();
				if (JSON.stringify(this.position) !== JSON.stringify(currentPosition)) {
					this.setPosition(currentPosition);
					setCookie("scoreboard_position", JSON.stringify(currentPosition));
				}
			});

		this.switchBtn.on("change", () => {
			if (this.switchBtn.is(":checked")) {
				ipcRenderer.send("open-guesses");
			} else {
				ipcRenderer.send("close-guesses");
			}
		});

		this.table = $("#datatable").DataTable({
			info: false,
			searching: false,
			paging: false,
			scrollY: 100,
			scrollResize: true,
			scrollCollapse: true,
			language: { zeroRecords: " " },
			dom: "Bfrtip",
			buttons: [
				{
					extend: "colvis",
					text: "⚙️",
					className: "colvis-btn",
					columns: ":not(.noVis)",
				},
			],
			columns: [
				{ data: "Position" },
				{ data: "Player" },
				{ data: "Streak" },
				{
					data: "Distance",
					render: (data, type) => {
						if (type === "display" || type === "filter") {
							return this.toMeter(data);
						}
						return data;
					},
				},
				{ data: "Score" },
			],
			columnDefs: [
				{ targets: 0, width: "35px", className: "noVis" },
				{ targets: 1, width: "auto", className: "noVis" },
				{ targets: 2, width: "55px" },
				{ targets: 3, width: "100px" },
				{ targets: 4, width: "75px", type: "natural" },
			],
		});

		// Column Visisbility
		this.columnState = getCookie("CG_ColVis", [
			{ column: 0, state: true },
			{ column: 2, state: true },
			{ column: 3, state: true },
			{ column: 4, state: true },
		]);

		// Handle ColVis change
		this.table.on("column-visibility.dt", (e, settings, column, state) => {
			if (this.isResults || this.isMultiGuess) return;

			const i = this.columnState.findIndex((o) => o.column === column);
			if (this.columnState[i]) {
				this.columnState[i] = { column, state };
			} else {
				this.columnState.push({ column, state });
			}

			setCookie("CG_ColVis", JSON.stringify(this.columnState));
		});

		// ColVis Cookies
		function setCookie(name, value, exdays = 60) {
			const d = new Date();
			d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
			const expires = "expires=" + d.toUTCString();
			document.cookie = name + "=" + value + ";" + expires + ";path=/";
		}

		function getCookie(name, defaultValue = {}) {
			const cname = name + "=";
			var decodedCookie = decodeURIComponent(document.cookie);
			var ca = decodedCookie.split(";");
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == " ") {
					c = c.substring(1);
				}
				if (c.indexOf(cname) == 0) {
					return JSON.parse(c.substring(cname.length, c.length));
				}
			}
			return defaultValue;
		}

		// SCROLLER
		const sliderElem = `<input type="range" min="5" max="50" value="20" id="scrollSpeedSlider">`;
		$(".dt-buttons").append(sliderElem);

		const slider = document.getElementById("scrollSpeedSlider");

		slider.oninput = (e) => {
			this.speed = e.currentTarget.value;
			this.scroller(".dataTables_scrollBody");
		};

		const scrollBtn = `
			<div class="dt-button scrollBtn">
			<label>
				<input type="checkbox" id="scrollBtn"><span>⮃</span>
			</label>
			</div>
		`;
		$(".dt-buttons").prepend(scrollBtn);

		$("#scrollBtn").on("change", (e) => {
			if (e.currentTarget.checked != true) {
				this.isScrolling = $(e.currentTarget).is(":checked");
				this.stop(".dataTables_scrollBody");
				slider.style.display = "none";
			} else {
				this.isScrolling = $(e.currentTarget).is(":checked");
				this.scroller(".dataTables_scrollBody");
				slider.style.display = "inline";
			}
		});
	}

	/**
	 * @param {boolean} isMultiGuess
	 */
	reset = (isMultiGuess) => {
		this.isMultiGuess = isMultiGuess;
		this.setColVis();
		this.isResults = false;
		this.setTitle("GUESSES (0)");
		this.showSwitch(true);
		this.table.clear().draw();
	};

	show = () => {
		this.container.css("display", "block");
	};

	hide = () => {
		this.container.css("display", "none");
	};

	renderGuess = (guess) => {
		const row = {
			Position: "",
			Player: `${guess.flag ? `<span class="flag-icon flag-icon-${guess.flag}"></span>` : ""}<span class='username' style='color:${guess.color}'>${
				guess.username
			}</span>`,
			Streak: guess.streak,
			Distance: guess.distance,
			Score: guess.score,
		};

		const rowNode = this.table.row.add(row).node();
		rowNode.classList.add("expand");
		setTimeout(() => {
			rowNode.classList.remove("expand");
		}, 200);

		this.table.order([3, "asc"]).draw(false);
		this.table
			.column(0)
			.nodes()
			.each((cell, i) => {
				cell.innerHTML = i + 1;
			});
	};

	renderMultiGuess = (guesses) => {
		const rows = guesses.map((guess) => {
			return {
				Position: "",
				Player: `${guess.flag ? `<span class="flag-icon flag-icon-${guess.flag}"></span>` : ""}<span class='username' style='color:${guess.color}'>${
					guess.username
				}</span>`,
				Streak: "",
				Distance: "",
				Score: "",
			};
		});

		this.table.clear().draw();
		this.table.rows.add(rows).draw();
	};

	displayScores = (scores, isTotal = false) => {
		this.isResults = true;
		if (scores[0]) scores[0].color = "#E3BB39";
		if (scores[1]) scores[1].color = "#C9C9C9";
		if (scores[2]) scores[2].color = "#A3682E";
		const rows = scores.map((score) => {
			return {
				Position: "",
				Player: `${score.flag ? `<span class="flag-icon flag-icon-${score.flag}"></span>` : ""}<span class='username' style='color:${score.color}'>${
					score.username
				}</span>`,
				Streak: score.streak,
				Distance: score.distance,
				Score: `${score.score}${isTotal ? " [" + score.rounds + "]" : ""}`,
			};
		});

		this.table.clear().draw();
		this.table.rows.add(rows);

		this.table.order([4, "desc"]).draw(false);

		let content;
		this.table
			.column(0)
			.nodes()
			.each((cell, i) => {
				content = i + 1;
				if (isTotal) {
					if (i == 0) content = "<span class='icon'>🏆</span>";
					else if (i == 1) content = "<span class='icon'>🥈</span>";
					else if (i == 2) content = "<span class='icon'>🥉</span>";
				}

				cell.innerHTML = content;
			});

		// Restore columns visibility
		this.table.columns().visible(true);
		this.toTop(".dataTables_scrollBody");
	};

	scroller = (elem) => {
		const div = $(elem);

		const loop = () => {
			if (!this.isScrolling) return;
			div.stop().animate({ scrollTop: div[0].scrollHeight }, (div[0].scrollHeight - div.scrollTop() - 84) * this.speed, "linear", () => {
				setTimeout(() => {
					div.stop().animate({ scrollTop: 0 }, 1000, "swing", () => {
						setTimeout(() => {
							loop();
						}, 2000);
					});
				}, 1000);
			});
		};
		loop();
	};

	toTop = (elem) => {
		this.stop(elem);
		setTimeout(() => {
			this.scroller(elem);
		}, 2000);
	};

	stop(elem) {
		$(elem).stop();
	}

	setColVis = () => {
		if (this.isMultiGuess) {
			this.table.columns([0, 2, 3, 4]).visible(false);
		} else {
			this.columnState.forEach((column) => {
				this.table.column(column.column).visible(column.state);
			});
		}
	};

	getPosition = () => ({
		top: this.scoreboard.position().top,
		left: this.scoreboard.position().left,
		width: this.scoreboard.width(),
		height: this.scoreboard.height(),
	});

	setPosition = (position) => (this.position = position);

	setTitle = (title) => this.title.text(title);

	showSwitch = (state) => this.switchContainer.css("display", state ? "block" : "none");

	switchOn = (state) => this.switchBtn.prop("checked", state);

	toMeter = (distance) => (distance >= 1 ? parseFloat(distance.toFixed(1)) + "km" : parseInt(distance * 1000) + "m");
}

module.exports = Scoreboard;
