/*
 * CLUtopia bot by JERisBRISK
 * 
 * Features
 * - disallowed names (grandfathering certain IDs)
 * - temporary mutes
 * - temporary bans
 * - permanent bans
 * - warnings (x strikes => you're out)
 * - forgiveness
 * - infractions / rapsheet
 */

// include
const Discord = require('discord.js');
require('dotenv').config();
const AppName = "CLUtopia"
const Version = "0.1.0";
// #ifdef DEBUG
const Flavor = "Debug";
// #else
const Flavor = "Release";
// #endif
const Author = "JERisBRISK";
const CommandPrefix = '!';
const CommandPrefixLength = CommandPrefix.length;

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
            debug(`    ${shape} is a RegExp, validating ${arg}`);
            // #endif
            if (!shape.test(arg)) {
                let reason = `${arg} does NOT match ${shape}`
                // #ifdef DEBUG
                debug(`      ${reason}`)
                // #endif
                return new ValidationResult(false, reason);
            }
        }

        // null or other shape types are skipped
    }

    // if we have not failed by this point, return success
    return new ValidationResult(true, "");
}

// data for ban command
const RolesImmuneToBan = process.env.BOT_ROLES_IMMUNE_TO_BAN.split(',').filter(Boolean)

//!ban @member reason
//Bans a member. Buh-bye.
function ban(msg, args) {
    // #ifdef DEBUG
    debug(`ban('${args}')`);
    // #endif
    var vr = validate(args,
        [
            // @member, which Discord expands to <@!0123456789012345> (! only if they have a nickname)
            /(?:^<@!?[\d]{18}>)/i,
            // reason, which we can be anything
            null,
        ]);

    if (!vr.success) {
        msg.reply(`${vr.reason}.\nTry: \`${CommandPrefix}ban @member reason\``);
        return;
    }

    let split = splitAtFirstSpace(args);
    if (split.length > 1) {
        var member = split[0];
        var reason = split[1];
    } else {
        var member = split[0];
        var reason = "";
    }

    var user = msg.mentions.users.first();
    var member = msg.guild.member(user.id);
    var serverOwner = msg.guild.owner;

    // see if the target is a member of a protected class
    if (member) {
        // #ifdef DEBUG
        debug(`${member.displayName} has roles: ${member.roles ? member.roles.cache.map(r => `${r.name}`).join(', ') : 'none'}`);
        // #endif
        if (member === serverOwner) {
            msg.reply(`member <@!${user.id}> has immunity because they own the place.`);
            return;
        } else if (member.roles.cache.some(role => RolesImmuneToBan.includes(role.name))) {
            audit(`${user.id} was not banned because they possess one or more of the following roles: ${RolesImmuneToBan.join(', ')}`)
            msg.reply(`member <@!${user.id}> has role-based immunity.`);
            return;
        }
    }
    
    msg.reply(`member <@!${user.id}> was banned with reason: **${reason}**`);
}

// globals
var Commands = {
    ban: ban,

    //!cleanup [@member] [count] reason
    //Deletes a number of *un-pinned* comments from the channel.
    //If member is specified, only messages by that member are removed.
    //(Pins are kept so we can clean up spam/dreck around valuable messages)
    cleanup: "cleanup",

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

// init
const client = new Discord.Client();

client.login(process.env.BOT_TOKEN);

client.on('message', (msg) => {
    audit(`${msg.author.username} ${msg.author} said '${msg.content}' in ${msg.channel.name} ${msg.channel}`);
    
    // this is not a bot command, bail out
    if (!msg.content.startsWith(CommandPrefix)) {
        // #ifdef DEBUG
        debug("Not a bot command. Ignoring.");
        // #endif
        return;
    }

    // trim the starting CommandPrefix character
    let text = msg.content.substring(CommandPrefixLength);

    // whitespace immediately followed the CommandPrefix, bail out
    if (text[0] === ' ') {
        // #ifdef DEBUG
        debug('Command was prefixed with whitespace. Ignoring message.')
        // #endif
        return;
    };

    // split input into keyword and arguments
    let split = splitAtFirstSpace(text);
    if (split.length > 1) {
        var keyword = split[0];
        var args = split[1];
    } else {
        var keyword = split[0];
        var args = "";
    }

    // #ifdef DEBUG
    debug(`Provided keyword: ${keyword}`);
    debug(`Provided arguments: ${args}`);
    // #endif

    // handle various commands
    if (keyword in Commands) {
        // #ifdef DEBUG
        debug(`Identified keyword: ${keyword}`);
        // #endif

        // don't allow the bot to be used against itself
        var target = msg.mentions.users.first();
        if (client.user.id == target.id) {
            msg.reply(`your mind powers will not work on me.`);
            return;
        }

        // execute the command
        (Commands[keyword])(msg, args);
    } else {
        // #ifdef DEBUG
        debug(`'${keyword}' is not a recognized command.`);
        // #endif
    }
});

// #ifdef DEBUG
function debug(s) {
    console.debug(`DEBUG|${s}`);
}
// #endif

function audit(s) {
    console.log(`AUDIT|${new Date().toUTCString()}: ${s.replace(/[\r\n]/g,' ')}`);
}

function splitAtFirstSpace(s) {
    let firstSpaceIndex = s.indexOf(' ');
    if (firstSpaceIndex != -1) {
        return [s.substring(0, firstSpaceIndex), 
                s.substr(firstSpaceIndex + 1)];
    }
    return [s];
}

audit(`Starting ${AppName} ${Version} [${Flavor}] by ${Author}`);
