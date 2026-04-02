const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SERVE STATIC FILE
app.use(express.static("public"));

// PLAYER LIST
const playersList = [
  "Pia","Nairda","Nay","Idot","Nova",
  "Pranu","Ivan","Rzna","Ais","Nabin"
];

let players = {};
let buzzed = null;
let gameActive = false;

let timer = 0;
let timerInterval = null;

// INIT PLAYER SCORE
playersList.forEach(name => {
  players[name] = { score: 0 };
});

// SOCKET CONNECTION
io.on("connection", (socket) => {

  // PLAYER JOIN
  socket.on("join", (name)=>{
    socket.name = name;
    if(players[name]){
      socket.emit("score-self", players[name].score);
    }
  });

  // SEND DATA
  socket.on("get-data", ()=>{
    socket.emit("init", { players });
  });

  // START ROUND
  socket.on("start-round", ()=>{
    buzzed = null;
    gameActive = true;

    if(timerInterval){
      clearInterval(timerInterval);
    }

    io.emit("reset");
  });

  // BUZZ SYSTEM
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

  // SCORE UPDATE
  socket.on("score", ({name,value})=>{
    if(players[name]){
      players[name].score += value;

      io.emit("score-update", {
        players,
        highlight:{name,value}
      });

      io.emit("play-sound", value > 0 ? "correct" : "wrong");
    }
  });

  // RESET SCORE
  socket.on("reset-score", ()=>{
    Object.keys(players).forEach(p=>{
      players[p].score = 0;
    });

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

// ROOT CHECK
app.get("/", (req,res)=>{
  res.send("Quiz Buzzer Server is running 🚀");
});

// PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
