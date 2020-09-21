const GameHelper = {};

    /**
     * Checks if '/game/' is in the URL
     * On fail it returns false
     * @param {string} url Game URL
     */
    GameHelper.isGameURL = (url) => {
        return url.includes("/game/");
    };

    /**
     * Gets the Game ID from a game URL
     * Checks if ID is 16 characters in length
     * On fail it returns false
     * @param {string} url Game URL
     */
    GameHelper.getGameId = (url) => {
        let id = url.substring(url.lastIndexOf("/") + 1);
        if(id.length == 16){
            return id;
        }
        else{
            return false;
        }
    };






module.exports = GameHelper;

