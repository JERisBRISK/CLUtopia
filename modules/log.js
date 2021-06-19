function debug(s) {
    // #ifdef DEBUG
    console.debug(`DEBUG|${s}`);
    // #endif
}

function audit(s) {
    console.log(`AUDIT|${new Date().toUTCString()}: ${s.replace(/[\r\n]/g,' ')}`);
}

module.exports = {
    debug : debug,
    audit : audit,
}