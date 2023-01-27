// @ts-nocheck
export function blinkMode() {
    let timeLimit = 1.5;
    let roundDelay = 1;

    const classicGameGuiHTML = `
    <div class="section_sectionHeader__WQ7Xz section_sizeMedium__yPqLK"><div class="bars_root___G89E bars_center__vAqnw"><div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div><span class="bars_content__UVGlL"><h3>Blink Mode settings</h3></span><div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div></div></div>
    <div class="start-standard-game_settings__x94PU" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">Enabled</span>
                <input type="checkbox" id="enableScript" onclick="toggleBlinkMode(this)" class="toggle_toggle__hwnyw">
            </div>
        
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">Time (Seconds)</span>
                <input type="text" id="blinkTime" onchange="changeBlinkTime(this)" style="background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 5px; width: 60px;">
            </div>
        
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">Round Delay (Seconds)</span>
                <input type="text" id="delayTime" onchange="changeDelayTime(this)" style="background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 5px; width: 60px;">
            </div>
        </div>
    </div>
    `;

    if (localStorage.getItem("blinkEnabled") == null) {
        localStorage.setItem("blinkEnabled", "disabled");
    }

    if (
        localStorage.getItem("blinkTime") == null ||
        isNaN(localStorage.getItem("blinkTime"))
    ) {
        localStorage.setItem("blinkTime", timeLimit);
    }
    if (
        localStorage.getItem("delayTime") == null ||
        isNaN(localStorage.getItem("delayTime"))
    ) {
        localStorage.setItem("delayTime", roundDelay);
    }

    timeLimit = parseFloat(localStorage.getItem("blinkTime"));
    roundDelay = parseFloat(localStorage.getItem("delayTime"));

    window.toggleBlinkMode = (e) => {
        localStorage.setItem(
            "blinkEnabled",
            e.checked ? "enabled" : "disabled"
        );

        if (document.querySelector("#enableScript")) {
            document.querySelector("#enableScript").checked = e.checked;
        }
        if (document.querySelector("#enableScriptHeader")) {
            document.querySelector("#enableScriptHeader").checked = e.checked;
        }
    };

    window.changeBlinkTime = (e) => {
        if (!isNaN(e.value)) {
            localStorage.setItem("blinkTime", parseFloat(e.value));
            timeLimit = parseFloat(e.value);

            if (document.querySelector("#blinkTime")) {
                document.querySelector("#blinkTime").value = e.value;
            }
            if (document.querySelector("#blinkTimeHeader")) {
                document.querySelector("#blinkTimeHeader").value = e.value;
            }
        }
    };

    window.changeDelayTime = (e) => {
        if (!isNaN(e.value)) {
            localStorage.setItem("delayTime", parseFloat(e.value));
            roundDelay = parseFloat(e.value);

            if (document.querySelector("#delayTime")) {
                document.querySelector("#delayTime").value = e.value;
            }
            if (document.querySelector("#delayTimeHeader")) {
                document.querySelector("#delayTimeHeader").value = e.value;
            }
        }
    };

    const checkInsertGui = () => {
        // Play page for classic games
        if (
            document.querySelector(".radio-box_root__ka_9S") &&
            document.querySelector("#enableScript") === null
        ) {
            document
                .querySelector(".section_sectionMedium__yXgE6")
                .insertAdjacentHTML("beforeend", classicGameGuiHTML);
            if (localStorage.getItem("blinkEnabled") === "enabled") {
                document.querySelector("#enableScript").checked = true;
            }
            document.querySelector("#blinkTime").value = timeLimit;
            document.querySelector("#delayTime").value = roundDelay;
        }
    };

    function hidePanorama() {
        document.querySelector(
            ".mapsConsumerUiSceneInternalCoreScene__root"
        ).style.filter = "brightness(0%)";
    }

    function showPanorama() {
        document.querySelector(
            ".mapsConsumerUiSceneInternalCoreScene__root"
        ).style.filter = "brightness(100%)";
    }

    function isLoading() {
        return (
            document.querySelector(".fullscreen-spinner_root__IwRRr") ||
            !document.querySelector(".widget-scene-canvas")
        );
    }

    let wasBackdropThereOrLoading = false;
    function isBackdropThereOrLoading() {
        return (
            isLoading() || // loading
            document.querySelector(".result-layout_root__NfX12") || // classic
            document.querySelector(".overlay_backdrop__Rh_QC") || // duels / team duels
            document.querySelector(".game_backdrop__A_Ze9") ||
            document.querySelector(".overlays_backdrop__sIb35") || // live challenges
            document.querySelector(".popup_backdrop__R52hP") || // BR
            document.querySelector(".game-starting_container__TMoWC") ||
            document.querySelector(".round-score_container__avps2") || // bullseye
            document.querySelector(".overlay-modal_backlight__Ekx7t")
        ); // city streaks
    }

    let showTimeoutID = null;
    let hideTimeoutID = null;
    function triggerBlink() {
        hidePanorama();
        clearTimeout(showTimeoutID);
        showTimeoutID = setTimeout(showPanorama, roundDelay * 1000);
        clearTimeout(hideTimeoutID);
        hideTimeoutID = setTimeout(
            hidePanorama,
            (timeLimit + roundDelay) * 1000
        );
    }

    let observer = new MutationObserver((mutations) => {
        checkInsertGui();

        if (localStorage.getItem("blinkEnabled") === "enabled") {
            if (isBackdropThereOrLoading()) {
                wasBackdropThereOrLoading = true;
                if (!isLoading()) hidePanorama();
            } else if (wasBackdropThereOrLoading) {
                wasBackdropThereOrLoading = false;
                triggerBlink();
            }
        }
    });

    observer.observe(document.body, {
        characterDataOldValue: false,
        subtree: true,
        childList: true,
        characterData: false,
    });
}
