const END_URL = "https://chatguessr.herokuapp.com";

const axios = require("axios");
const io = require("socket.io-client");

class RoomSocket{
    
    /**
     * Creates a RoomSocket
     * No params needed for now
     */
    constructor(){
        // Nothing here for now
    }

    /**
	 * Sends the bot name to be added into the bots list
     * Server wait for socket join and on join it creates a
     * Room, then we join that room where guesses will arrive
     * May take up to 30 seconds to resolve when server is sleeping
     * This is because of Heroku been free it sends it to sleep.
     * Returns a Promise. Resolves to true on success
     * On fail rejects to an error
	 * @return "string" Bot name in lowercase
	 */
    addBot(bot){
        return new Promise((resolve, reject) => {

            let options = { headers: { "Content-Type": "application/json" } };

            axios
            .post(`${END_URL}/game/bots/add`, { "bot": bot }, options)
            .then((res) => {
                if(res.data.status === "OK" && res.data.bot === bot){

                    // Socket into bots room so a room for us gets created
                    const SOCKET = io.connect(`${END_URL}/game/bots`, { "query": { "bot": bot }} );

                    // Once connected we get a message on this "channel"
                    SOCKET.on("joinBotRoom", (data) => {
                        // We get back our bot name to join to specific socket (The room where guesses will arrive)
                        if(data.bot === bot){
                            const BOT_ROOM = io.connect(`${END_URL}/game/bots/${bot}`, { "query": { "bot": bot }} );
                            // In this channel we get our bot name back upon connection
                            BOT_ROOM.on("bot", (data) => {
                                // We get back our bot name if we joined successfully
                                if(data.bot === bot){
                                    // TODO: Send a message in chat confirming this event?
                                    // Confirmed we joined the room where guesses will arrive
                                    resolve(true);
                                }
                            });
        
                            // This channel receives guesses
                            BOT_ROOM.on("guess", (data) => {
                                // TODO: Add your logic here to handle guessed
                                /** The data object looks like this
                                 * {
                                        login: 'american2050',
                                        display_name: 'American2050',
                                        coordinates: { lat: 40.44694705960048, lng: -106.5234375 },
                                        profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/beb8ea5a-6144-408f-80a4-56da5a34590a-profile_image-300x300.png'
                                    }       
                                 */
                                console.log(data);
                            });
                        }
                    });
                }
            })
            .catch((error) => {
                console.log(error);
                reject(error);
            });
        });
    }
}

// TODO: Uncomment this to run this file from console using node as an example.
// Create an instance of this class where you really consider it appropriate.

/*
const RS = new RoomSocket();

// Replace "test" with the real bot name in all lowercase (for consistency)
RS.addBot("test").then((res) => {
    console.log("Bot joined room");
})
.catch((error) => {
    console.log(error);
});
*/

module.exports = RoomSocket;



