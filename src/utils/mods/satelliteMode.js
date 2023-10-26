// @ts-nocheck
export function satelliteMode() {
    let boundsLimit = 10;

    const classicGameGuiHTML = `
        <div class="section_sectionHeader___QLJB section_sizeMedium__CuXRP">
            <div class="bars_root__SJrvT bars_center__AoNIw">
                <div class="bars_before__U7vM7 bars_lengthLong__MxBhh"></div>
                <span class="bars_content__hFIqO"><h3>Satellite Mode settings</h3></span>
                <div class="bars_after__zBDbp bars_lengthLong__MxBhh"></div>
            </div>
        </div>

        <div class="start-standard-game_settings__e5G0o">
            <div style="display: flex; justify-content: space-between">
                <div style="display: flex; align-items: center">
                    <span class="game-options_optionLabel__Vk5xN" style="margin: 0; padding-right: 6px">Enabled</span>
                    <input
                        type="checkbox"
                        id="enableSatelliteMode"
                        onclick="toggleSatelliteMode(this)"
                        class="toggle_toggle__qfXpL"
                    />
                </div>

                <div style="display: flex; align-items: center">
                    <label class="game-options_option__xQZVa game-options_editableOption__0hL4c">
                        <div class="game-options_optionLabel__Vk5xN">Limit (in km)</div>
                        <input
                            type="range"
                            class="custom-slider"
                            min="1"
                            max="500"
                            step="1"
                            id="boundsLimit"
                            oninput="changeBoundsLimit(this)"
                        />
                        <div class="game-options_optionLabel__Vk5xN" id="boundsLimitText"></div>
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
            document.querySelector('[class^="radio-box_root__"]') &&
            document.querySelector("#enableSatelliteMode") === null
        ) {
            document
                .querySelector('[class^="section_sectionMedium__"]')
                .insertAdjacentHTML("beforeend", classicGameGuiHTML);

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
