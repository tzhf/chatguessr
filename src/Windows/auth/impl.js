import { supabase } from "../../utils/supabase";

/** @type {HTMLButtonElement} */
const startAuth = document.querySelector("#start-auth");
startAuth.addEventListener("click", () => {
    startAuth.disabled = true;
    supabase.auth.signOut().finally(() => {
        // @ts-expect-error TS2304: defined by preload script
        chatguessrApi.startAuth();
    });
});