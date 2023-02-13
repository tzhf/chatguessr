// @ts-nocheck
export function satelliteMode() {
    let boundsLimit = 10;

    const classicGameGuiHTML = `
        <div class="section_sectionHeader__WQ7Xz section_sizeMedium__yPqLK">
            <div class="bars_root___G89E bars_center__vAqnw">
                <div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div>
                <span class="bars_content__UVGlL"><h3>Satellite Mode settings</h3></span>
                <div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div>
            </div>
        </div>

        <div class="start-standard-game_settings__x94PU">
            <div style="display: flex; justify-content: space-between">
                <div style="display: flex; align-items: center">
                    <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px">Enabled</span>
                    <input
                        type="checkbox"
                        id="enableSatelliteMode"
                        onclick="toggleSatelliteMode(this)"
                        class="toggle_toggle__hwnyw"
                    />
                </div>

                <div style="display: flex; align-items: center">
                    <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
                        <div class="game-options_optionLabel__dJ_Cy">Limit (in km)</div>
                        <input
                            type="range"
                            class="custom-slider"
                            min="1"
                            max="500"
                            step="1"
                            id="boundsLimit"
                            oninput="changeBoundsLimit(this)"
                        />
                        <div class="game-options_optionLabel__dJ_Cy" id="boundsLimitText"></div>
                    </label>
                </div>
            </div>
        </div>
    `;

    if (localStorage.getItem("satelliteModeEnabled") == null) {
        localStorage.setItem("satelliteModeEnabled", "disabled");
    }

    if (
        localStorage.getItem("satelliteModeBoundsLimit") == null ||
        isNaN(localStorage.getItem("satelliteModeBoundsLimit"))
    ) {
        localStorage.setItem("satelliteModeBoundsLimit", boundsLimit);
    }

    boundsLimit = parseInt(localStorage.getItem("satelliteModeBoundsLimit"));

    window.toggleSatelliteMode = (e) => {
        localStorage.setItem("satelliteModeEnabled", e.checked ? "enabled" : "disabled");

        if (document.querySelector("#enableSatelliteMode")) {
            document.querySelector("#enableSatelliteMode").checked = e.checked;
        }
    };

    window.changeBoundsLimit = (e) => {
        if (!isNaN(e.value)) {
            localStorage.setItem("satelliteModeBoundsLimit", parseInt(e.value));
            boundsLimit = parseInt(e.value);

            if (document.querySelector("#boundsLimitText")) {
                document.querySelector("#boundsLimitText").textContent = e.value + " km";
            }
        }
    };

    const checkInsertGui = () => {
        // Play page for classic games
        if (
            document.querySelector(".radio-box_root__ka_9S") &&
            document.querySelector("#enableSatelliteMode") === null
        ) {
            document.querySelector(".section_sectionMedium__yXgE6").insertAdjacentHTML("beforeend", classicGameGuiHTML);

            if (localStorage.getItem("satelliteModeEnabled") === "enabled") {
                document.querySelector("#enableSatelliteMode").checked = true;
            }

            document.querySelector("#boundsLimit").value = boundsLimit;
            document.querySelector("#boundsLimitText").textContent = boundsLimit + " km";
        }
    };

    const observer = new MutationObserver(() => {
        checkInsertGui();
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true,
    });
}
