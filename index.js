require("dotenv").config();
const axios = require("axios");

const tmi = require("tmi.js");

const opts = {
  identity: {
    username: process.env.CLIENT_ID,
    password: process.env.TWITCH_BOT_TOKEN,
  },
  channels: [process.env.CHANNEL_ID],
};
const client = new tmi.client(opts);

client.on("connected", onConnectedHandler);
client.on("message", onMessageHandler);
client.on("whisper", (from, userstate, message, self) => {
  let message_out = response(message, from);
  message_out.then((response) => {
    client
      .whisper(from, response.data || "No entiendo que dices")
      .catch((err) => {
        console.error(err);
      });
  });
});

client.connect();

const response = async (message, nombre) => {
  const options = {
    method: "GET",
    url: process.env.NLP_URL,
    json: true,
    data: { frase: message, nombre: nombre },
  };
  return await axios(options);
};

function onMessageHandler(target, context, msg, self) {
  if (self) return;

  const commandName = msg.trim();

  if (commandName.startsWith("!dice")) {
    const sides = parseInt(commandName.split(" ")[1]);
    const num = rollDice(sides);
    client.say(target, `${context.username} ha sacado un ${num}`);
    console.log(`* Executed ${commandName} command`);
  } else if (msg.toLowerCase().includes("@perjubot")) {
    let message_out = response(msg, context.username);
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
}

function rollDice(nSides) {
  const sides = isNaN(nSides) ? 6 : nSides;
  return Math.floor(Math.random() * sides) + 1;
}

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
