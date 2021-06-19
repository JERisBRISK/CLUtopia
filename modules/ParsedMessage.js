const Log = require('./log.js');
const Config = require('./config.js');

class ParsedMessage {
    constructor(message) {
        this.message = message;

        // initialize these to default values
        this.keyword = "";
        this.arguments = [];

        // message does not start with the CommandPrefix
        if (!message.content.startsWith(Config.CommandPrefix)) {
            // #ifdef DEBUG
            debug('ParsedMessage: Not a bot command.');
            // #endif
            this.isCommand = false;
            return;
        }

        // trim the starting CommandPrefix character
        let text = message.content.substring(Config.CommandPrefixLength);

        // whitespace immediately followed the CommandPrefix
        if (text[0] === ' ') {
            this.isCommand = false;
            // #ifdef DEBUG
            debug('ParsedMessage: Command was prefixed with whitespace.')
            // #endif
            return;
        };

        // split input into keyword and arguments
        this.isCommand = true;
        let split = splitAtFirstSpace(text);
        this.keyword = split[0];
        this.arguments = split[1];

        // #ifdef DEBUG
        Log.debug(`Parsed keyword: ${this.keyword}`);
        Log.debug(`Parsed arguments: ${this.arguments}`);
        // #endif
    }
}

module.exports = ParsedMessage;