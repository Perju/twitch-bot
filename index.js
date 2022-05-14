import axios from "axios";
import fs from "fs";
import { RefreshingAuthProvider, StaticAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { PubSubClient } from "@twurple/pubsub";

class PGTwitchBot {
  constructor(config) {
    this.config = config;
    this.advices = [];
    this.relations = {};
    this.intervalAdvises = { _destroyed: true };
    this.botAuth = createRefreshingAuthProvider(
      process.env.TWITCH_BOT_ID,
      process.env.TWITCH_BOT_SECRET,
      this.config.botTokens
    );

    this.chatClient = new ChatClient({
      authProvider: this.botAuth,
      channels: [process.env.CHANNEL_ID],
    });

    this.streamerAuth = createRefreshingAuthProvider(
      process.env.STREAMER_ID,
      process.env.STREAMER_SECRET,
      this.config.streamerTokens
    );

    this.pubSubClient = new PubSubClient();
    this.listener = addRedemListener(
      this.streamerAuth,
      this.pubSubClient,
      this.chatClient
    );
  }

  initBot() {
    this.initAdvices(this.config.advices);
    this.initRelations(this.config.relations);

    this.chatClient.onConnect(this.onConnectHandler);
    this.chatClient.onMessage(
      this.onMessageHandler(this.getResponse, this.chatClient, this.relations)
    );

    this.chatClient.onWhisper(this.onWhisperHandler);

    this.chatClient.connect();
  }

  onConnectHandler() {
    console.log("Connected to chat:");
  }

  initAdvices(fileName) {
    let data = fs.readFileSync(fileName).toString();
    this.advices = data.split(/\r?\n/).filter((e) => e !== "");
  }
  startAdvises() {
    if (this.intervalAdvises._destroyed) {
      this.intervalAdvises = setInterval(() => {
        this.sayAdvise(this.chatClient, "#perju_gatar", this.advices);
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

  sayAdvise(chatClient, target, advices) {
    chatClient.say(target, rndElem(advices)).catch((err) => console.log(err));
  }

  onWhisperHandler(user, message, msg) {
    const NLP_URL = process.env.NLP_URL;
    let message_out = this.getResponse(NLP_URL, message, user);
    message_out.then((response) => {
      this.chatClient
        .whisper(user, response.data || "No entiendo que dices")
        .catch((err) => {
          console.error(err);
        });
    });
  }

  onMessageHandler(getResponse, chatClient, relations) {
    return (channel, user, message) => {
      if (process.env.TWITCH_BOT_NAME === user) return;

      const commandName = message.trim();
      if (commandName.startsWith("!dice")) {
        const sides = parseInt(commandName.split(" ")[1]);
        const num = rollDice(sides);
        chatClient.say(channel, `${user} ha sacado un ${num}`);
        console.log(`* Executed ${commandName} command`);
      } else if (message.toLowerCase().includes(process.env.TWITCH_BOT_NAME)) {
        const NLP_URL = process.env.NLP_URL;
        let message_out = getResponse(NLP_URL, message, user, relations[user]);
        message_out
          .then((response) => {
            let text = response.data || "No entiendo que dices";
            chatClient.emit("chat_res", { channel: channel, text: text });
            chatClient.say(channel, text);
          })
          .catch((err) => {
            console.log(err);
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

async function addRedemListener(auth, psClient, chatClient) {
  let streamerId = await psClient.registerUserListener(auth);
  return await psClient.onRedemption(streamerId, (message) => {
    chatClient.emit("redem", { id: message.id });
  });
}

function createRefreshingAuthProvider(clientId, clientSecret, tokenFile) {
  let tokenData = JSON.parse(fs.readFileSync(tokenFile, "UTF-8"));
  let auth = new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: (newTokenData) =>
        fs.writeFileSync(
          tokenFile,
          JSON.stringify(newTokenData, null, 4),
          "UTF-8"
        ),
    },
    tokenData
  );
  return auth;
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
