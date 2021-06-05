/*
 * CLUtopia bot by JERisBRISK
 */

// include
const Discord = require('discord.js');
require('dotenv').config();

// init
const client = new Discord.Client();

client.login(process.env.BOT_TOKEN);

client.on('message', (msg) => {
    if (msg.content === 'Hello') {
        msg.reply('Hi');
    }
});