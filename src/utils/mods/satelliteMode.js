// @ts-nocheck
export function satelliteMode() {
    const classicGameGuiHTML = `
    <div class="section_sectionHeader__WQ7Xz section_sizeMedium__yPqLK"><div class="bars_root___G89E bars_center__vAqnw"><div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div><span class="bars_content__UVGlL"><h3>Satellite Mode settings</h3></span><div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div></div></div>
    <div class="start-standard-game_settings__x94PU">
        <div style="display: flex; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">Enabled</span>
                <input type="checkbox" id="enableSatelliteMode" onclick="toggleSatelliteMode(this)" class="toggle_toggle__hwnyw">
            </div>

            <div style="display: flex; align-items: center;">
            <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">Limit (meters)</span>
            <input type="number" id="boundsLimit" min="50" max="" onchange="changeBoundsLimit(this)" style="background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 5px; width: 80px;">
        </div>
        </div>
    </div>
    `;

    if (localStorage.getItem("satelliteModeEnabled") == null) {
        localStorage.setItem("satelliteModeEnabled", "disabled");
    }

    if (
        localStorage.getItem("boundsLimit") == null ||
        isNaN(localStorage.getItem("boundsLimit"))
    ) {
        localStorage.setItem("boundsLimit", 10000);
    }

    window.toggleSatelliteMode = (e) => {
        localStorage.setItem(
            "satelliteModeEnabled",
            e.checked ? "enabled" : "disabled"
        );

        if (document.querySelector("#enableSatelliteMode")) {
            document.querySelector("#enableSatelliteMode").checked = e.checked;
        }
    };

    window.changeBoundsLimit = (e) => {
        if (!isNaN(e.value)) {
            if (e.value < 100) e.value = 100;
            if (e.value > 100000) e.value = 1000000;
            localStorage.setItem("boundsLimit", parseInt(e.value));

            if (document.querySelector("#boundsLimit")) {
                document.querySelector("#boundsLimit").value = e.value;
            }
        }
    };

    const checkInsertGui = () => {
        // Play page for classic games
        if (
            document.querySelector(".radio-box_root__ka_9S") &&
            document.querySelector("#enableSatelliteMode") === null
        ) {
            document
                .querySelector(".section_sectionMedium__yXgE6")
                .insertAdjacentHTML("beforeend", classicGameGuiHTML);
            if (localStorage.getItem("satelliteModeEnabled") === "enabled") {
                document.querySelector("#enableSatelliteMode").checked = true;
            }
            document.querySelector("#boundsLimit").value = parseInt(
                localStorage.getItem("boundsLimit")
            );
        }
    };

    let observer = new MutationObserver((mutations) => {
        checkInsertGui();
    });

    observer.observe(document.body, {
        characterDataOldValue: false,
        subtree: true,
        childList: true,
        characterData: false,
    });
}
