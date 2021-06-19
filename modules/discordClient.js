const Discord = require('discord.js');

const myIntents = new Discord.Intents();
myIntents.add('GUILD_MEMBERS','GUILD_MESSAGES');

const DiscordClient = new Discord.Client({ 
    partials: ['MESSAGE', 'CHANNEL', 'GUILD_MEMBER', 'USER'],
    intents: myIntents,
    fetchAllMembers: false
});
    
module.exports = DiscordClient;
