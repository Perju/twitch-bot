import path from "path";
import dotenv from "dotenv";
dotenv.config();
import PGTwitchBot from "./index.js";

const moduleURL = new URL(import.meta.url);
const __dirname = path.dirname(moduleURL.pathname);

const botConfig = {
  botTokens: __dirname + "/bottokens.json",
  streamerTokens: __dirname + "/streamertokens.json",
  advices: __dirname + "/advices.txt",
  relations: __dirname + "/relations.txt",
};

const bot = new PGTwitchBot(botConfig);
function start() {
  bot.initBot();
  bot.startAdvises();
  bot.chatClient.on("chat_res", (data) => {
    console.log("event chat_res:", data);
    bot.chatClient.say("#perju_gatar", "mierda");
  });
  bot.chatClient.on("redem", (data) => {
    console.log("event redem:", data);
    bot.chatClient.say("#perju_gatar", "mierda");
  });
}

start();
