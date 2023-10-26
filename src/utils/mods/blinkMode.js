// @ts-nocheck
export function blinkMode() {
    let timeLimit = 0.8;
    let roundDelay = 1;

    const classicGameGuiHTML = `
        <div class="section_sectionHeader___QLJB section_sizeMedium__CuXRP">
            <div class="bars_root__SJrvT bars_center__AoNIw">
                <div class="bars_before__U7vM7 bars_lengthLong__MxBhh"></div>
                <span class="bars_content__hFIqO"><h3>Blink Mode settings</h3></span>
                <div class="bars_after__zBDbp bars_lengthLong__MxBhh"></div>
            </div>
        </div>
        <div class="start-standard-game_settings__e5G0o">
            <div class="game-options_optionGroup__eOMZ3">
                <div style="display: flex; justify-content: space-between">
                    <div style="display: flex; align-items: center">
                        <span class="game-options_optionLabel__Vk5xN" style="margin: 0; padding-right: 6px">Enabled</span>
                        <input type="checkbox" id="enableScript" onclick="toggleBlinkMode(this)" class="toggle_toggle__qfXpL" />
                    </div>

                    <div style="display: flex; align-items: center">
                        <label class="game-options_option__xQZVa game-options_editableOption__0hL4c">
                            <div class="game-options_optionLabel__Vk5xN">Time (Seconds)</div>
                            <input
                                type="range"
                                class="custom-slider"
                                min="0.1"
                                max="5"
                                step="0.1"
                                id="blinkTime"
                                oninput="changeBlinkTime(this)"
                            />
                            <div class="game-options_optionLabel__Vk5xN" id="blinkTimeText"></div>
                        </label>
                    </div>

                    <div style="display: flex; align-items: center">
                        <label class="game-options_option__xQZVa game-options_editableOption__0hL4c">
                            <div class="game-options_optionLabel__Vk5xN">Round delay (Seconds)</div>
                            <input
                                type="range"
                                class="custom-slider"
                                min="0.1"
                                max="5"
                                step="0.1"
                                id="delayTime"
                                oninput="changeDelayTime(this)"
                            />
                            <div class="game-options_optionLabel__Vk5xN" id="delayTimeText"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (localStorage.getItem("blinkEnabled") == null) {
        localStorage.setItem("blinkEnabled", "disabled");
    }

    if (localStorage.getItem("blinkTime") == null || isNaN(localStorage.getItem("blinkTime"))) {
        localStorage.setItem("blinkTime", timeLimit);
    }

    if (localStorage.getItem("delayTime") == null || isNaN(localStorage.getItem("delayTime"))) {
        localStorage.setItem("delayTime", roundDelay);
    }

    timeLimit = parseFloat(localStorage.getItem("blinkTime"));
    roundDelay = parseFloat(localStorage.getItem("delayTime"));

    window.toggleBlinkMode = (e) => {
        localStorage.setItem("blinkEnabled", e.checked ? "enabled" : "disabled");
        if (!e.checked) {
            try {
                showPanoramaCached();
            } catch {}
        }

        if (document.querySelector("#enableScript")) {
            document.querySelector("#enableScript").checked = e.checked;
        }
    };

    window.changeBlinkTime = (e) => {
        if (!isNaN(e.value)) {
            localStorage.setItem("blinkTime", parseFloat(e.value));
            timeLimit = parseFloat(e.value);

            if (document.querySelector("#blinkTimeText")) {
                document.querySelector("#blinkTimeText").textContent = e.value + " sec";
            }
        }
    };

    window.changeDelayTime = (e) => {
        if (!isNaN(e.value)) {
            localStorage.setItem("delayTime", parseFloat(e.value));
            roundDelay = parseFloat(e.value);

            if (document.querySelector("#delayTimeText")) {
                document.querySelector("#delayTimeText").textContent = e.value + " sec";
            }
        }
    };

    const checkInsertGui = () => {
        if (document.querySelector('[class^="radio-box_root__"]') && document.querySelector("#enableScript") === null) {
            document
                .querySelector('[class^="section_sectionMedium__"]')
                .insertAdjacentHTML("beforeend", classicGameGuiHTML);

            if (localStorage.getItem("blinkEnabled") === "enabled") {
                document.querySelector("#enableScript").checked = true;
            }

            document.querySelector("#blinkTime").value = timeLimit;
            document.querySelector("#delayTime").value = roundDelay;
            document.querySelector("#blinkTimeText").textContent = timeLimit + " sec";
            document.querySelector("#delayTimeText").textContent = roundDelay + " sec";
        }
    };

    let mapRoot = null;
    function hidePanorama() {
        mapRoot = document.querySelector(".mapsConsumerUiSceneInternalCoreScene__root") || mapRoot;
        hidePanoramaCached();
    }

    function hidePanoramaCached() {
        mapRoot.style.filter = "brightness(0%)";
    }

    function showPanorama() {
        mapRoot = document.querySelector(".mapsConsumerUiSceneInternalCoreScene__root") || mapRoot;
        showPanoramaCached();
    }

    function showPanoramaCached() {
        mapRoot.style.filter = "brightness(100%)";
    }

    function isLoading() {
        return (
            document.querySelector('[class^="fullscreen-spinner_root__"]') ||
            !document.querySelector(".widget-scene-canvas")
        );
    }

    let wasBackdropThereOrLoading = false;
    function isBackdropThereOrLoading() {
        return isLoading() || document.querySelector('[class^="result-layout_root__"]');
    }

    let showTimeoutID = null;
    let hideTimeoutID = null;
    function triggerBlink() {
        hidePanorama();
        clearTimeout(showTimeoutID);
        showTimeoutID = setTimeout(showPanorama, roundDelay * 1000);
        clearTimeout(hideTimeoutID);
        hideTimeoutID = setTimeout(hidePanorama, (timeLimit + roundDelay) * 1000);
    }

    const observer = new MutationObserver(() => {
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
        subtree: true,
        childList: true,
    });
}
