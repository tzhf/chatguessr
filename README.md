<div align="center">
  <img src="./build/icon.png" style="width:80px">
  <h1>Customized ChatGuessr</h1>
</div>

## Info

This is a customized Chatguessr Version. It is extending the main App version 3.0.3 by some fun modes, additional settings and advanced customizability.

Be aware that it is in constant development at the moment. Releases should be stable, but if you want to be sure, get the official ChatGuessr from <a href="https://chatguessr.com">the ChatGuessr.com website</a>

It is created with the support and input from the amazing ChatGuessr Community on Twitch. <3

## Support

Do you want to support the project? Go to <a href="https://chatguessr.com">the official ChatGuessr.com website</a>. You can find a dono link at the bottom.

## Platform Support

Only Windows right now. Mac build process is currently not working. Sorry about that. Trying to look into that soon.

## Differences

### Mode Settings

- Chicken Mode:
Closest guess doesn't get any any points next round. So last round is free.

Additional Chicken Modes: 

Getting a 5k bypasses you for getting 0 points next round. This means that 0 points will be given to the first non-5k guess in rounds 1-4.

Getting a 5k always gives you points even if you were first the previous round.

- Wrong Country only mode:
If you plonk in the right Country you get 0 points. Be aware that Borders are not always mapped 100% right. Guessing right on the border can be dangerous. Do you dare to plonk one of your 50/50? Which side of the right country are you plonking?

- Invert scoring:
You know where it is? Plonk the antipode. Furthest Plonk wins. Best played with difficult Maps like Pain and Suffering or Random Pan and Zoom World.

- Make Waterplonks Mandatory/Illegal:
Tired of the Water Hedges? Tired of always plonking on Land? Switch it up. Mandatory Waterplonks means only plonking in international Waters. Coast does not count. (Hint: use OpenStreetMap)

- Countdown/-up:

Countdown mode: The current round you guess has to have less letters than the previous, so plonking in a country with a lot of letters in the first round would be best. For example: UnitedKingdom (13) -> Afghanistan (11) -> Thailand (8) -> Myanmar (7) -> China (5).

Countup mode: The current round you guess has to have more letters than the previous, so plonking in a country with a few letters in the first round would be best. For example: Iran (4) -> Malta (5) -> Greece (6) -> Myanmar (7) -> UnitedKingdom (13)

### Game Settings

- Activate or deactivate every Type of Message.
- Additional Commands: !randomplonkwater (in international Waters only), !mode (shows Game Mode)
- !addpoints to gift Points (Nightbot or Stream Elements) to Viewers for winning Rounds or Games. Command can be customized.

### Other

- Reduce Opacity when hovering over the Flag on Results Screen to be better able to read City Names.
- Hide Info Box (the purple thing on top right with Map Name, Round & Score) and Map when hiding Scoreboard.
- Fix Bug that causes repeating "Guesses are opened", "Round Started" when clicking "Play Again" after a game.
- add custom Flags in the `\AppData\Roaming\ChatGuessr\flags` directory. If image file is called test.jpg command would be "!flag test". Allowed files are: .svg, .png, .jpg, .jpeg, .webp, .gif, .apng
- add possibility to change Twitch messages to display different text.
- fixed random plonk issue (no avatar, players who changed their name were able to double plonk)
- exclude streamer data from !best commands

## License

The ChatGuessr source is available under the [MIT License](./LICENSE).

The Montserrat font is used under the [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL).

