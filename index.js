import axios from "axios";
import fs from "fs";
import tmi from "tmi.js";

class PGTwitchBot {
  constructor(config) {
    this.config = config;
    this.advices = [];
    this.relations = {};
    this.intervalAdvises = { _destroyed: true };
    const opts = {
      identity: {
        username: this.config.env.CLIENT_ID,
        password: this.config.env.TWITCH_BOT_TOKEN,
      },
      channels: [this.config.env.CHANNEL_ID],
    };
    this.client = new tmi.client(opts);
  }

  initBot() {
    this.initAdvices(this.config.advices);
    this.initRelations(this.config.relations);

    this.client.on("connected", this.onConnectedHandler);

    this.client.on(
      "message",
      this.onMessageHandler(this.getResponse, this.client, this.relations)
    );

    this.client.on("whisper", (from, userstate, message, self) => {
      const NLP_URL = process.env.NLP_URL;
      let message_out = this.getResponse(NLP_URL, message, from);
      message_out.then((response) => {
        this.client
          .whisper(from, response.data || "No entiendo que dices")
          .catch((err) => {
            console.error(err);
          });
      });
    });

    this.client.connect();
  }

  initAdvices(fileName) {
    let data = fs.readFile(fileName);
    this.advices = data.split(/\r?\n/).filter((e) => e !== "");
  }
  startAdvises() {
    if (this.intervalAdvises._destroyed) {
      this.intervalAdvises = setInterval(() => {
        this.sayAdvise(this.client, "#perju_gatar", this.advices);
      }, 600000);
    }
  }
  stopAdvises() {
    clearInterval(this.intervalAdvises);
  }

  initRelations(fileName) {
    let data = fs.readFileSync(fileName).toString();
    this.relations = data.split(/\r?\n/).reduce((acc, cur) => {
      let kv = cur.split("=");
      if (kv.length === 2) acc[kv[0]] = kv[1];
      return acc;
    }, {});
  }

  onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }

  sayAdvise(client, target, advices) {
    client.say(target, rndElem(advices)).catch((err) => console.log(err));
  }

  onMessageHandler(getResponse, client, relations) {
    return (target, context, msg, self) => {
      if (self) return;

      const commandName = msg.trim();
      if (commandName.startsWith("!dice")) {
        const sides = parseInt(commandName.split(" ")[1]);
        const num = rollDice(sides);
        client.say(target, `${context.username} ha sacado un ${num}`);
        console.log(`* Executed ${commandName} command`);
      } else if (msg.toLowerCase().includes("@perjubot")) {
        const NLP_URL = process.env.NLP_URL;
        let message_out = getResponse(
          NLP_URL,
          msg,
          context.username,
          relations[context.username]
        );
        message_out.then((response) => {
          client
            .say(target, response.data || "No entiendo que dices")
            .catch((err) => {
              console.error(err);
            });
        });
      } else {
        console.log(`* Unknown command ${commandName}`);
      }
    };
  }

  getResponse(url, frase, nombre, relation) {
    const options = {
      method: "GET",
      url: url,
      json: true,
      data: {
        frase: frase,
        nombre: nombre,
        relacion: relation,
      },
    };
    return axios(options);
  }
}

function rollDice(nSides) {
  const sides = isNaN(nSides) ? 6 : nSides;
  return Math.floor(Math.random() * sides) + 1;
}

function rndElem(arr) {
  return arr === undefined
    ? "Preparando cosicas"
    : arr[Math.floor(Math.random() * arr.length)];
}

export default PGTwitchBot;
