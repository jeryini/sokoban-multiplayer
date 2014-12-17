# Sokoban multiplayer
A multiplayer version of the popular Japanese game Sokoban.

## Purpose
This project was done for a challenge which was organised by [Celtra](http://www.celtra.com/) and [Faculty of Computer and Information Science](http://www.fri.uni-lj.si/en/), [University of Ljubljana](http://www.uni-lj.si/eng/). More about this challenge on [faculty page](http://www.fri.uni-lj.si/si/raziskave/studentski_izzivi/celtrin_izziv/). The project was selected as the best solution in the category of HTML5 multiplayer game and has consequently won the challenge in that category ([news in Slovenian](http://www.fri.uni-lj.si/si/novice_in_dogodki/aktivne/18809/novica.html)).

## General Requirements
This solution **requires** the following systems:
* [node.js](http://nodejs.org/)
* All other dependencies are specified in package.json and include:
 * "body-parser": "~1.8.1",
 * "cookie-parser": "~1.3.3",
 * "debug": "~2.0.0",
 * "express": "~4.9.0",
 * "jade": "~1.6.0",
 * "morgan": "~1.3.0",
 * "serve-favicon": "~2.1.3",
 * "socket.io": "^1.1.0",
 * "browserify": "6.1.0",
 * "mongoose": "3.8.18",
 * "node-uuid": "1.4.1"

## Game look
A quick taste how the game looks:
![picture alt](https://wv0klg.dm2304.livefilestore.com/y2pR2S8gJ62E8gR8oAj-Ttp3P0suIl9cK-Wzf_hR1K1lMA4yFSfPFk8htOYNV60r3kCyFrb3_MDNpy4n23XlYO-YtgucDPZJxjEqef07wVhD6E/sokoban_application.png?psid=1 "Sokoban multiplayer game")

## Running
A quick tutorial for running the game.

1. First run the following command in project root (this is where package.json is located):
   ```
   npm install
   ```
2. Open node.js command prompt (in project root) and run the following command:
   ```
   node bin\www.js
   ```

3. Browse to <http://localhost:3000> and play!!!

## More information
More information about the solution is available in the [following report](https://onedrive.live.com/redir?resid=3CA18FAC4B5A16DF%2170265) but is only available in Slovenian language.
