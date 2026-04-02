const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const playersList = [
  "Pia","Nairda","Nay","Idot","Nova",
  "Pranu","Ivan","Rzna","Ais","Nabin"
];

let players = {};
let buzzed = null;
let gameActive = false;

let timer = 0;
let timerInterval = null;

// INIT
playersList.forEach(name => {
  players[name] = { score: 0 };
});

io.on("connection", (socket) => {

  socket.on("join", (name)=>{
    socket.name = name;
    socket.emit("score-self", players[name].score);
  });

  socket.on("get-data", ()=>{
    socket.emit("init", { players });
  });

  // START ROUND
  socket.on("start-round", ()=>{
    buzzed = null;
    gameActive = true;
    io.emit("reset");
  });

  // BUZZ
  socket.on("buzz", ()=>{
    if (!gameActive) return;

    if (!buzzed){
      buzzed = socket.name;
      gameActive = false;

      io.emit("buzz-result", buzzed);
      io.emit("play-sound","buzzer");

      // START TIMER AFTER BUZZ
      timer = 30;
      io.emit("timer", timer);

      timerInterval = setInterval(()=>{
        timer--;
        io.emit("timer", timer);

        if (timer <= 0){
          clearInterval(timerInterval);
          io.emit("timer-end");
        }
      },1000);
    }
  });

  // SCORE
  socket.on("score", ({name,value})=>{
    players[name].score += value;

    io.emit("score-update", {
      players,
      highlight:{name,value}
    });

    io.emit("play-sound", value > 0 ? "correct" : "wrong");
  });

  // RESET SCORE
  socket.on("reset-score", ()=>{
    Object.keys(players).forEach(p=>players[p].score=0);
    io.emit("score-update",{players});
  });

  // FINISH → PODIUM
  socket.on("finish", ()=>{
    const sorted = Object.keys(players)
      .sort((a,b)=>players[b].score - players[a].score);

    const podium = sorted.slice(0,3);

    io.emit("show-podium", {
      first: podium[0],
      second: podium[1],
      third: podium[2],
      players
    });
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
Update server for Railway
