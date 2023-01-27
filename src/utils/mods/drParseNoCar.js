// @ts-nocheck
export function drParseNoCar() {
    const classicGameGuiHTML = `
    <div class="section_sectionHeader__WQ7Xz section_sizeMedium__yPqLK"><div class="bars_root___G89E bars_center__vAqnw"><div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div><span class="bars_content__UVGlL"><h3>NCNC settings</h3></span><div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div></div></div>
    <div class="start-standard-game_settings__x94PU" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-around;">
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">No car</span>
                <input type="checkbox" id="enableNoCar" onclick="toggleNoCarMode(this)" class="toggle_toggle__hwnyw">
            </div>
            <div style="display: flex; align-items: center;">
                <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">No compass</span>
                <input type="checkbox" id="enableNoCompass" onclick="toggleNoCompassMode(this)" class="toggle_toggle__hwnyw">
            </div>
        </div>
    </div>
    `;

    const REMOVE_COMPASS_CSS =
        '.compass, .game-layout__compass, [class^="panorama-compass_"] { display: none; }';

    const compassRemover = document.createElement("style");
    compassRemover.textContent = REMOVE_COMPASS_CSS;

    if (localStorage.getItem("noCarEnabled") == null) {
        localStorage.setItem("noCarEnabled", "disabled");
    }

    if (localStorage.getItem("noCompassEnabled") == null) {
        localStorage.setItem("noCompassEnabled", "disabled");
    }

    window.toggleNoCarMode = (e) => {
        localStorage.setItem(
            "noCarEnabled",
            e.checked ? "enabled" : "disabled"
        );

        if (document.querySelector("#enableNoCar")) {
            document.querySelector("#enableNoCar").checked = e.checked;
        }
        location.reload();
    };

    window.toggleNoCompassMode = (e) => {
        localStorage.setItem(
            "noCompassEnabled",
            e.checked ? "enabled" : "disabled"
        );

        if (document.querySelector("#enableNoCompass")) {
            document.querySelector("#enableNoCompass").checked = e.checked;
        }
    };

    const checkInsertGui = () => {
        // Play page for classic games
        if (
            document.querySelector(".radio-box_root__ka_9S") &&
            document.querySelector("#enableNoCar") === null
        ) {
            document
                .querySelector(".section_sectionMedium__yXgE6")
                .insertAdjacentHTML("beforeend", classicGameGuiHTML);

            if (localStorage.getItem("noCarEnabled") === "enabled") {
                document.querySelector("#enableNoCar").checked = true;
                noCarScript();
            }

            if (localStorage.getItem("noCompassEnabled") === "enabled") {
                document.querySelector("#enableNoCompass").checked = true;
            } else {
                compassRemover.remove();
            }
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

function noCarScript() {
    const OPTIONS = { colorR: 0.5, colorG: 0.5, colorB: 0.5 };
    const vertexOld =
        "const float f=3.1415926;varying vec3 a;uniform vec4 b;attribute vec3 c;attribute vec2 d;uniform mat4 e;void main(){vec4 g=vec4(c,1);gl_Position=e*g;a=vec3(d.xy*b.xy+b.zw,1);a*=length(c);}";
    const fragOld =
        "precision highp float;const float h=3.1415926;varying vec3 a;uniform vec4 b;uniform float f;uniform sampler2D g;void main(){vec4 i=vec4(texture2DProj(g,a).rgb,f);gl_FragColor=i;}";
    const vertexNew = `
            const float f=3.1415926;
            varying vec3 a;
            varying vec3 potato;
            uniform vec4 b;
            attribute vec3 c;
            attribute vec2 d;
            uniform mat4 e;
            void main(){
                vec4 g=vec4(c,1);
                gl_Position=e*g;
                a = vec3(d.xy * b.xy + b.zw,1);
                a *= length(c);
                potato = vec3(d.xy, 1.0) * length(c);
            }
        `;

    const fragNew = `
            precision highp float;
            const float h=3.1415926;
            varying vec3 a;
            varying vec3 potato;
            uniform vec4 b;
            uniform float f;
            uniform sampler2D g;
            void main(){
    
            vec2 aD = potato.xy / a.z;
            float thetaD = aD.y;
    
            float thresholdD1 = 0.6;
            float thresholdD2 = 0.7;
    
            float x = aD.x;
            float y = abs(4.0*x - 2.0);
            float phiD = smoothstep(0.0, 1.0, y > 1.0 ? 2.0 - y : y);
    
            vec4 i = vec4(thetaD > mix(thresholdD1, thresholdD2, phiD)
            ? vec3(float(${OPTIONS.colorR}), float(${OPTIONS.colorG}), float(${OPTIONS.colorB})) // texture2DProj(g,a).rgb * 0.25
            : texture2DProj(g,a).rgb,f);
            gl_FragColor=i;
            }
        `;

    /** @param {WebGLRenderingContext | WebGL2RenderingContext} ctx */
    function installShaderSource(ctx) {
        const g = ctx.shaderSource;
        /** @type {WebGLRenderingContext['shaderSource']} */
        function shaderSource(...args) {
            if (typeof args[1] === "string") {
                let glsl = args[1];
                if (glsl === vertexOld) glsl = vertexNew;
                else if (glsl === fragOld) glsl = fragNew;
                return g.call(this, args[0], glsl);
            }
            return g.apply(this, args);
        }
        shaderSource.bestcity = "bintulu";
        ctx.shaderSource = shaderSource;
    }

    /** @param {HTMLCanvasElement} el */
    function installGetContext(el) {
        const g = el.getContext;
        el.getContext = function (...args) {
            if (args[0] === "webgl" || args[0] === "webgl2") {
                /** @type {WebGLRenderingContext | WebGL2RenderingContext} */
                const ctx = g.apply(this, args);
                // @ts-ignore TS2339
                if (
                    ctx &&
                    ctx.shaderSource &&
                    ctx.shaderSource.bestcity !== "bintulu"
                ) {
                    installShaderSource(ctx);
                }
                return ctx;
            }
            return g.apply(this, args);
        };
    }

    const createElement = document.createElement.bind(document);
    document.createElement = function (tagName, options) {
        if (tagName === "canvas" || tagName === "CANVAS") {
            const el = createElement("canvas");
            installGetContext(el);
            return el;
        }
        return createElement(tagName, options);
    };
}
