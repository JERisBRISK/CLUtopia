/*
 * CLUtopia bot by JERisBRISK
 * 
 * Features
 * - disallowed names (grandfathering certain IDs) auto-banned
 * - temporary mutes
 * - temporary bans
 * - permanent bans
 * - silence
 * - warnings (x strikes => you're out)
 * - forgiveness
 * - infractions / rapsheet
 */

// include
const Log = require('./modules/log.js');
const Config = require('./modules/config.js');
const Db = require('./modules/db.js');
const ParsedMessage = require('./modules/ParsedMessage');
const DiscordClient = require('./modules/discordClient.js');

const AppName = "CLUtopia"
const Version = "0.1.0";
const Author = "JERisBRISK";

// #ifdef DEBUG
const Flavor = "Debug";
// #else
const Flavor = "Release";
// #endif

class ValidationResult {
    constructor(success, reason) {
        this.success = success;
        this.reason = reason;
    }
}

function validate(args, shapes) {
    // split the string, removing empty entries
    let a = args.split(' ').filter(Boolean);

    // validate args
    if (!a || (shapes && shapes.length > a.length)) {
        return new ValidationResult(false, "not enough arguments were provided");
    }

    // validate each positional argument in order
    // against a possible RegEx in the same position
    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];
        let arg = a[i];
       
        if (shape instanceof RegExp) {
            // #ifdef DEBUG
            Log.debug(`    ${shape} is a RegExp, validating ${arg}`);
            // #endif
            if (!shape.test(arg)) {
                let reason = `${arg} does NOT match ${shape}`
                // #ifdef DEBUG
                Log.debug(`      ${reason}`)
                // #endif
                return new ValidationResult(false, reason);
            }
        }

        // null or other shape types are skipped
    }

    // if we have not failed by this point, return success
    return new ValidationResult(true, "");
}

function parseImmunities(environmentValue) {
    var split = environmentValue ? environmentValue.split(',').filter(Boolean) : [""];
    return split.map(s => s.trim());
}

// immunities
const Immunities = {
    _all_ : {
        roles : parseImmunities(process.env.BOT_ROLES_IMMUNE_TO_ALL),
        users : parseImmunities(process.env.BOT_USERS_IMMUNE_TO_ALL),
    },
    ban : {
        roles : parseImmunities(process.env.BOT_ROLES_IMMUNE_TO_BAN),
        users : parseImmunities(process.env.BOT_USERS_IMMUNE_TO_BAN),
    },
};

function userIsImmune(guild, user, command) {
    // #ifdef DEBUG
    Log.debug(`userIsImmune called with ${guild.name}, ${user.username} (${user.id}), ${command}`);
    // #endif

    var member = guild.member(user.id);
    var serverOwner = guild.owner;

    var summedRoles = Immunities._all_.roles.concat(Immunities[command].roles);
    var summedUsers = Immunities._all_.users.concat(Immunities[command].users);

    // see if the target is a member of a protected class
    if (member) {
        // #ifdef DEBUG
        Log.debug(`${member.displayName} has roles: ${member.roles ? member.roles.cache.map(r => `${r.name}`).join(', ') : 'none'}`);
        // #endif
        if (summedRoles.map(r => {if (r.toUpperCase() == "OWNER") return r;})
            && member === serverOwner) {
            Log.audit(`member <@!${user.id}> has immunity because they own the place.`);
            return true;
        } else if (summedUsers.includes(user.id)) {
            Log.audit(`${user.id} has user-based immunity to this command.`);
            return true;
        } else if (member.roles.cache.some(r => summedRoles.includes(r.name))) {
            Log.audit(`${user.id} has role-based immunity to this command.`);
            return true;
        }
    }

    return false;
}

//!ban @member reason
//Bans a member. Buh-bye.
function ban(parsedMessage) {
    // #ifdef DEBUG
    Log.debug(`ban('${parsedMessage.arguments}')`);
    // #endif
    var vr = validate(parsedMessage.arguments,
        [
            // @member, which Discord expands to <@!0123456789012345> (! only if they have a nickname)
            /(?:^<@!?[\d]{18}>)/i,
            // reason, which we can be anything
            null,
        ]);

    var msg = parsedMessage.message;

    if (!vr.success) {
        msg.reply(`${vr.reason}.\nTry: \`${Config.CommandPrefix}ban @member reason\``);
        return;
    }

    let split = splitAtFirstSpace(parsedMessage.arguments);
    var member = split[0];
    var reason = split[1];

    var user = msg.mentions.users.first();

    if (userIsImmune(msg.guild, user, 'ban')) {
        msg.reply(`member <@!${user.id}> is immune to this command.`);
        return;
    }
    
    msg.reply(`member <@!${user.id}> was banned with reason: **${reason}**`);
}

function cleanup(msg) {
    // TODO: implement cleanup
}

// globals
var Commands = {
    ban: ban,
    cleanup: cleanup,

    //!forgive @member [all | count] reason
    // all - sets their infraction count to zero
    // count - removes that many infractions from their record
    forgive: "forgive",
    
    //!infractions @member
    //Shows information on a member's current infractions
    infractions: "infractions",

    //!kick @member reason
    //Kicks a member from the server
    kick: "kick",

    //!silence @member duration reason
    //Temporarily blocks a member of the server from talking in Voice channels
    //Duration is either 'min' or 'h', e.g. "15min" or "1h"
    silence: "silence",

    //!tempban @member duration reason
    //Temporarily bans a member from the server.
    //Duration is either 'min' or 'h', e.g. "15min" or "1h"
    tempban: "tempban",

    //!tempmute @member duration reason
    //Temporarily blocks a member of the server from typing in Text channels And joining or talking in Voice channels
    //Duration is either 'min', 'h', 'd', e.g. "15min" or "1h" or "7d"
    tempmute: "tempmute",
    
    //!unban @member reason
    //Un-Bans a member. Welcome back!
    unban: "ban",

    //!warn @member [count] reason
    //Warns a member an optional count of times. Default is 1 count.
    //3 warnings (either all at once or over time) results in an automatic 30 Day Mute
    warn: "warn",
};

DiscordClient.login(process.env.BOT_TOKEN)
    .then(() => { Log.audit("Successfully logged in to Discord."); })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

DiscordClient.on('message', (msg) => {
    Log.audit(`${msg.author.username} ${msg.author} said '${msg.content}' in ${msg.channel.name} ${msg.channel}`);

    let pm = new ParsedMessage(msg);

    // this is not a bot command, bail out
    if (!pm.isCommand) {
        // #ifdef DEBUG
        Log.debug("OnMessage: Not a bot command. Ignoring.");
        // #endif
        return;
    }

    // #ifdef DEBUG
    Log.debug(`Provided keyword: ${pm.keyword}`);
    Log.debug(`Provided arguments: ${pm.arguments}`);
    // #endif

    // handle various commands
    if (pm.keyword in Commands) {
        // #ifdef DEBUG
        Log.debug(`Identified keyword: ${pm.keyword}`);
        // #endif

        // don't allow the bot to be used against itself
        var target = msg.mentions.users.first();
        if (DiscordClient.user.id == target.id) {
            msg.reply(`your mind powers will not work on me.`);
            return;
        }

        // execute the command
        (Commands[pm.keyword])(pm);
    } else {
        // #ifdef DEBUG
        Log.debug(`'${pm.keyword}' is not a recognized command.`);
        // #endif
    }
});

// splits a string at the first space
// returns a two-element array
function splitAtFirstSpace(s) {
    let firstSpaceIndex = s.indexOf(' ');
    if (firstSpaceIndex != -1) {
        return [s.substring(0, firstSpaceIndex), 
                s.substr(firstSpaceIndex + 1)];
    }

    return [s, ""];
}

Log.audit(`Starting ${AppName} ${Version} [${Flavor}] by ${Author}`);
