import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import PGTwitchBot from "./index.js";

const moduleURL = new URL(import.meta.url);
const __dirname = path.dirname(moduleURL.pathname);

const botConfig = {
  env: process.env,
  advices: __dirname + "/advices.txt",
  relations: __dirname + "/relations.txt"
}

const bot = new PGTwitchBot(botConfig);
function start() {
  bot.initBot();
  bot.startAdvises();
}

start();
