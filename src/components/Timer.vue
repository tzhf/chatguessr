<template>
    <div id="timer" @mouseover="iconsVisibility = true" @mouseleave="!settingsVisibility ? iconsVisibility = false : true">
        <div id="timerDisplay" :style="{
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize + 'px',
            color: settings.color,
            textShadow: settings.shadowOffsetX + 'px ' + settings.shadowOffsetY + 'px ' + settings.shadowBlur + 'px ' + settings.shadowColor,
            WebkitTextStroke: settings.borderWidth + 'px ' + settings.borderColor,
            paddingBottom: '0.3rem',
        }">
            <div>{{ display }}</div>
            <div v-if="isTimeToPlonk">{{ settings.timeToPlonkMsg }}</div>
        </div>

        <div :class="iconsVisibility ? 'expanded' : 'collapsed'">
            <div class="flex_center">
                <svg class="icon" @click="start" v-if="!isStarted || isPaused" :fill="settings.color" stroke="#000"
                    stroke-width="16" viewBox="0 0 512 512">
                    <path
                        d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm115.7 272l-176 101c-15.8 8.8-35.7-2.5-35.7-21V152c0-18.4 19.8-29.8 35.7-21l176 107c16.4 9.2 16.4 32.9 0 42z" />
                </svg>
                <svg class="icon" @click="pause" v-else :fill="settings.color" stroke="#000" stroke-width="1"
                    viewBox="0 0 45.812 45.812">
                    <path
                        d="M39.104,6.708c-8.946-8.943-23.449-8.946-32.395,0c-8.946,8.944-8.946,23.447,0,32.394 c8.944,8.946,23.449,8.946,32.395,0C48.047,30.156,48.047,15.653,39.104,6.708z M20.051,31.704c0,1.459-1.183,2.64-2.641,2.64 s-2.64-1.181-2.64-2.64V14.108c0-1.457,1.182-2.64,2.64-2.64s2.641,1.183,2.641,2.64V31.704z M31.041,31.704 c0,1.459-1.183,2.64-2.64,2.64s-2.64-1.181-2.64-2.64V14.108c0-1.457,1.183-2.64,2.64-2.64s2.64,1.183,2.64,2.64V31.704z" />
                </svg>
                <svg class="icon" @click="reset" v-if="isStarted" :fill="settings.color" stroke="#000" stroke-width="16"
                    viewBox="-32 0 512 512">
                    <path
                        d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z" />
                </svg>
                <svg class="icon" @click="settingsVisibility = !settingsVisibility" :fill="settings.color" stroke="#000"
                    stroke-width="1" viewBox="0 0 24 24">
                    <path
                        d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
                </svg>
            </div>
        </div>

        <div :hidden="!settingsVisibility" :class="settingsVisibility ? 'expanded' : 'collapsed'" class="timer__settings">
            <div class="form__field">
                <label class="radio__label">Start timer at round start</label>
                <input type="checkbox" v-model="settings.autoStart" />
            </div>
            <div class="form__field">
                <label class="radio__label">Close guesses when time's up</label>
                <input type="checkbox" v-model="settings.autoCloseGuesses" />
            </div>

            <hr>

            <div class="form__field">
                <label>Time ({{ settings.timeLimit }} sec) :</label>
                <input v-model="settings.timeLimit" type="range" min="5" max="600" step="5" @input="reset()" />
            </div>
            <div class="form__field">
                <label>Time's up message :</label>
                <input type="text" v-model="settings.timesUpMsg" spellcheck="false" />
            </div>
            <div class="form__field">
                <label>Time to plonk ({{ settings.timeToPlonk }} sec) :</label>
                <input v-model="settings.timeToPlonk" type="range" min="5" :max="settings.timeLimit" step="5"
                    @input="reset()" />
            </div>
            <div class="form__field">
                <label>Time to plonk message :</label>
                <input type="text" v-model="settings.timeToPlonkMsg" spellcheck="false" />
            </div>

            <hr>

            <div class="form__field">
                <label class="radio__label">Play sound when it's time to plonk</label>
                <input type="checkbox" v-model="settings.playAudio" />
            </div>
            <div class="form__field">
                <label class="radio__label">Load audio file</label>
                <div class="flex_center">
                    <button type="button" @click="importAudioFile">Import</button>
                    <svg class="icon" v-if="audioPath" @click="playAudio()" fill="#59f3b3" viewBox="0 0 260 228">
                        <path
                            d="M170.81,78.043l15.653-15.653c14.848,12.299,24.323,30.868,24.323,51.61c0,21.04-9.757,39.836-24.974,52.128l-15.68-15.68 c11.291-8.184,18.655-21.469,18.655-36.448C188.786,99.32,181.719,86.262,170.81,78.043z M236,114 c0,28.068-12.569,53.253-32.371,70.231l15.584,15.584C242.982,178.82,258,148.133,258,114c0-33.836-14.757-64.286-38.168-85.265 L204.257,44.31C223.696,61.28,236,86.229,236,114z M146,2L56.4,66H2v96h54.4l89.6,64V2z">
                        </path>
                    </svg>
                </div>
            </div>
            <div class="form__field">
                <label>Sound volume ({{ settings.audioVolume * 100 }} %) :</label>
                <input type="range" min="0" max="1" step="0.1" v-model="settings.audioVolume" />
            </div>

            <hr />

            <div class="form__field">
                <label>Font :</label>
                <select v-model="settings.fontFamily">
                    <option v-for="font in availableFonts" :value="font" :key="font" :style="{ fontFamily: font }">
                        {{ font }}
                    </option>
                </select>
            </div>
            <div class="form__field">
                <label>Font size ({{ settings.fontSize }}px) :</label>
                <input type="range" min="10" max="170" v-model="settings.fontSize" />
            </div>
            <div class="form__field">
                <label>Color :</label>
                <input type="color" v-model="settings.color" />
            </div>
            <hr />
            <div class="form__field">
                <label>Border width ({{ settings.borderWidth }}px) :</label>
                <input type="range" min="0" max="10" step="0.1" v-model="settings.borderWidth" />
            </div>
            <div class="form__field">
                <label>Border color :</label>
                <input type="color" v-model="settings.borderColor" />
            </div>

            <hr />

            <div class="form__field">
                <label>Shadow offset X ({{ settings.shadowOffsetX }}px) :</label>
                <input type="range" min="-20" max="20" step="1" v-model="settings.shadowOffsetX" />
            </div>
            <div class="form__field">
                <label>Shadow offset Y ({{ settings.shadowOffsetY }}px) :</label>
                <input type="range" min="-20" max="20" step="1" v-model="settings.shadowOffsetY" />
            </div>
            <div class="form__field">
                <label>Shadow blur ({{ settings.shadowBlur }}px) :</label>
                <input type="range" min="0" max="20" step="1" v-model="settings.shadowBlur" />
            </div>
            <div class="form__field">
                <label>Shadow color :</label>
                <input type="color" v-model="settings.shadowColor" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import "jquery-ui-dist/jquery-ui";
import type { ChatguessrApi } from "../preload";

const props = defineProps<{
    importAudioFile: ChatguessrApi["importAudioFile"],
    appDataPathExists: ChatguessrApi["appDataPathExists"]
    setGuessesOpen: ChatguessrApi["setGuessesOpen"]
}>();

const audioPath = ref<string | false>(false)

let targetTimestamp = 0;
let pausedDifference = 0;
let frameInterval = () => { };

const display = ref("00:00");
const isStarted = ref(false);
const isPaused = ref(false);
const isTimeToPlonk = ref(false);

const availableFonts = ref();
const settingsVisibility = ref(false);
const iconsVisibility = ref(false);

const settings = reactive(
    getLocalStorage("cg_timer__settings")
    || {
        visible: true,
        timeLimit: 90,
        timeToPlonk: 30,
        timesUpMsg: "Time's Up",
        timeToPlonkMsg: "🌍 Plonk Now 🌍",
        autoStart: false,
        autoCloseGuesses: false,
        playAudio: false,
        audioVolume: 1,
        fontFamily: "Lucida Console",
        fontSize: "50",
        color: "#59f3b3",
        borderWidth: "0.7",
        borderColor: "#ffffff",
        shadowOffsetX: "4",
        shadowOffsetY: "4",
        shadowBlur: "0",
        shadowColor: "#a159ff"
    }
);

onMounted(async () => {
    audioPath.value = await props.appDataPathExists("\\timer\\timer_alert");

    const timer = $("#timer");

    const timerPosition = getLocalStorage("cg_timer__position") || {
        top: 50,
        left: $("#CGFrameContainer").width()! / 2,
    };

    timer.css({
        top: timerPosition.top,
        left: timerPosition.left,
    });

    timer.draggable({ containment: '#CGFrameContainer' });

    timer.on("mouseup", () => {
        localStorage.setItem(
            "cg_timer__position",
            JSON.stringify({
                top: timer.position().top,
                left: timer.position().left + $("#timerDisplay").width()! / 2,
            })
        );
    });

    updateDisplay(settings.timeLimit * 1000);

    await document.fonts.ready;
    const fontsAvailable = new Set();

    const fontsList = new Set(
        [
            // Windows 10
            "Arial",
            "Arial Black",
            "Bahnschrift",
            "Calibri",
            "Cambria",
            "Cambria Math",
            "Candara",
            "Comic Sans MS",
            "Consolas",
            "Constantia",
            "Corbel",
            "Ebrima",
            "Franklin Gothic Medium",
            "Gabriola",
            "Gadugi",
            "Georgia",
            "HoloLens MDL2 Assets",
            "Impact",
            "Ink Free",
            "Javanese Text",
            "Leelawadee UI",
            "Lucida Console",
            "Lucida Sans Unicode",
            "Malgun Gothic",
            "Microsoft Himalaya",
            "Microsoft JhengHei",
            "Microsoft New Tai Lue",
            "Microsoft PhagsPa",
            "Microsoft Sans Serif",
            "Microsoft Tai Le",
            "Microsoft YaHei",
            "Microsoft Yi Baiti",
            "MingLiU-ExtB",
            "Mongolian Baiti",
            "MS Gothic",
            "MV Boli",
            "Myanmar Text",
            "Nirmala UI",
            "Palatino Linotype",
            "Segoe MDL2 Assets",
            "Segoe Print",
            "Segoe Script",
            "Segoe UI",
            "SimSun",
            "Sitka",
            "Sylfaen",
            "Symbol",
            "Tahoma",
            "Times New Roman",
            "Trebuchet MS",
            "Verdana",
            "Yu Gothic",
            // macOS
            "American Typewriter",
            "Andale Mono",
            "Arial",
            "Arial Black",
            "Arial Narrow",
            "Arial Rounded MT Bold",
            "Arial Unicode MS",
            "Avenir",
            "Avenir Next",
            "Avenir Next Condensed",
            "Baskerville",
            "Big Caslon",
            "Bodoni 72",
            "Bodoni 72 Oldstyle",
            "Bodoni 72 Smallcaps",
            "Bradley Hand",
            "Brush Script MT",
            "Chalkboard",
            "Chalkboard SE",
            "Chalkduster",
            "Charter",
            "Cochin",
            "Comic Sans MS",
            "Copperplate",
            "Courier",
            "Courier New",
            "Didot",
            "DIN Alternate",
            "DIN Condensed",
            "Futura",
            "Geneva",
            "Georgia",
            "Gill Sans",
            "Helvetica",
            "Helvetica Neue",
            "Herculanum",
            "Hoefler Text",
            "Impact",
            "Lucida Grande",
            "Luminari",
            "Marker Felt",
            "Menlo",
            "Microsoft Sans Serif",
            "Monaco",
            "Noteworthy",
            "Optima",
            "Palatino",
            "Papyrus",
            "Phosphate",
            "Rockwell",
            "Savoye LET",
            "SignPainter",
            "Skia",
            "Snell Roundhand",
            "Tahoma",
            "Times",
            "Times New Roman",
            "Trattatello",
            "Trebuchet MS",
            "Verdana",
            "Zapfino",
        ].sort()
    );

    for (const font of fontsList.values()) {
        if (document.fonts.check(`12px "${font}"`)) {
            fontsAvailable.add(font);
        }
    }

    availableFonts.value = [...fontsAvailable.values()];
});

watch(settings, () => {
    if (parseInt(settings.timeToPlonk) >= parseInt(settings.timeLimit)) settings.timeToPlonk = parseInt(settings.timeLimit);
    localStorage.setItem("cg_timer__settings", JSON.stringify(settings));
});

const start = () => {
    isStarted.value = true;
    isPaused.value = false;

    const nowTimestamp = Date.now();
    let targetTime = settings.timeLimit * 1000;

    if (pausedDifference) {
        targetTime = pausedDifference;
        pausedDifference = 0;
    }

    targetTimestamp = nowTimestamp + targetTime;

    frameInterval = () => {
        if (!isStarted.value) return;

        if (!isTimeToPlonk.value && targetTimestamp - Date.now() < settings.timeToPlonk * 1000) {
            isTimeToPlonk.value = true;
            if (settings.playAudio) playAudio();
        }

        if (targetTimestamp - Date.now() < 1) {
            reset();

            if (settings.timesUpMsg) display.value = settings.timesUpMsg;
            if (settings.autoCloseGuesses) props.setGuessesOpen(false);

        } else updateDisplay();

        requestAnimationFrame(frameInterval);
    };

    frameInterval();
}

const pause = () => {
    isPaused.value = true;

    const nowTimestamp = Date.now();
    pausedDifference = Math.abs(targetTimestamp - nowTimestamp);
    frameInterval = () => { };
}

const reset = () => {
    pause();

    isStarted.value = false;
    isPaused.value = false;
    isTimeToPlonk.value = false;

    const nowTimestamp = Date.now();
    targetTimestamp = nowTimestamp + settings.timeLimit * 1000;
    pausedDifference = 0;

    updateDisplay();
}

const updateDisplay = (targetTime?: number) => {
    const nowTimestamp = Date.now();

    if (targetTime !== undefined) {
        targetTimestamp = nowTimestamp + targetTime;
    }

    const time = Math.abs(Date.now() - targetTimestamp) / 1000;
    const numM = Math.floor(time / 60) % 60;
    const numS = Math.floor(time % 60);

    display.value = numM.toString().padStart(2, "0") + ":" + numS.toString().padStart(2, "0");
}

const playAudio = () => {
    if (!audioPath.value) return

    const path = audioPath.value + "?cb=" + new Date().getTime();
    const audio = new Audio(path);
    audio.volume = parseFloat(settings.audioVolume);
    audio.play();
}

const importAudioFile = async () => {
    try {
        const path = await props.importAudioFile();
        if (path) {
            audioPath.value = path;
        }
    } catch (err) {
        console.error(err);
    }
}

function getLocalStorage(key: string) {
    const storedSettings = localStorage.getItem(key);
    return storedSettings ? JSON.parse(storedSettings) : null
}

defineExpose({
    settings,
    start,
    reset
})
</script>

<style scoped>
#timer {
    height: 30px;
    width: fit-content;
    line-height: 1;
    text-align: center;
    user-select: none;
    pointer-events: auto;
    cursor: move;
    transform: translateX(-50%);
}

#timer * {
    pointer-events: auto;
}

.timer__settings {
    font-family: 'Montserrat';
    font-size: 14px;
    width: 380px;
    margin: 0.5rem auto;
    padding: 0.8rem;
    color: #FFFFFF;
    background-color: rgba(0, 0, 0, 0.4);
    box-shadow: rgb(0, 0, 0) 2px 2px 7px -2px;
    border-radius: 0.5rem;
}

.flex_center {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
}

.icon {
    width: 20px;
    height: 20px;
    transition: all ease-in-out 150ms;
    cursor: pointer;
}

.icon:hover {
    transform: scale(1.1);
}

.icon:active {
    transform: scale(0.8);
}

.form__field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
}

input,
select {
    padding: 0;
    height: 24px;
    font-family: inherit;
    font-size: inherit;
    background: rgba(0, 0, 0, 0.5);
    color: #FFFFFF;
    text-align: center;
    border-radius: 4px;
    overflow: hidden;
    outline: 0;
    cursor: pointer;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
}

input[type="color"] {
    padding: 1px 2px;
}

input:hover,
select:hover {
    filter: brightness(120%);
}

input[type="text"],
input[type="range"],
select {
    width: 160px;
}

input[type="text"],
select {
    border: 1px solid var(--main-color);
}

input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    border: none;
}

input[type="range"]::-webkit-slider-runnable-track {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    height: 0.5rem;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 14px;
    width: 14px;
    margin-top: -3px;
    border-radius: 50%;
    background-color: var(--main-color);
}

input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    color: var(--main-color);
    width: 1.15rem;
    height: 1.15rem;
    border: 1px solid var(--main-color);
    border-radius: 2px;
    display: grid;
    place-content: center;
    outline: none;
}

input[type="checkbox"]::before {
    content: "";
    width: 0.65rem;
    height: 0.65rem;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    transform: scale(0);
    transform-origin: bottom left;
    transition: 120ms transform ease-in-out;
    box-shadow: inset 1em 1em var(--main-color);
}

input[type="checkbox"]:checked::before {
    transform: scale(1);
}

select option {
    background: rgba(0, 0, 0, 0.8);
}

select::-webkit-scrollbar {
    width: 10px;
}

select::-webkit-scrollbar-track {
    border-radius: 10px;
}

select::-webkit-scrollbar-thumb {
    background: var(--main-color);
}


button {
    font-family: inherit;
    cursor: pointer;
    background-color: var(--main-color);
    padding: 0 0.5rem;
    height: 28px;
    font-weight: 700;
    border-radius: 3px;
}

button:hover {
    background: rgba(88, 243, 178, 0.9);
}

button:active {
    background: rgba(88, 243, 178, 0.8);
}

hr {
    width: 80%;
    height: 1px;
    margin: 0.5rem auto;
    background-color: var(--main-color);
    border: none;
}

.expanded {
    opacity: 1;
    animation: fadeIn 150ms ease-out forwards;
}

.collapsed {
    opacity: 0;
    animation: fadeOut 150ms ease-out forwards;
}

@keyframes fadeIn {
    0% {
        display: none;
        opacity: 0;
    }

    1% {
        display: block;
    }

    100% {
        display: block;
        opacity: 1;
    }
}

@keyframes fadeOut {
    0% {
        display: block;
        opacity: 1;
    }

    99% {
        display: block;
    }

    100% {
        display: none;
        opacity: 0;
    }
}
</style>