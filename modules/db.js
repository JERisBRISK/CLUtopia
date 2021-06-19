require('./config.js');

const Mongoose = require('mongoose');
const DbUrl = process.env.DB_URL
const DbName = process.env.DB_NAME;
const ConnectionString = DbUrl + "/" + DbName;

Mongoose.connect(ConnectionString, {useNewUrlParser: true, useUnifiedTopology: true});
const Db = Mongoose.connection;

Db.on('error', console.error.bind(console, 'connection error:'));

Db.once('open', function() {
    const kittySchema = new Mongoose.Schema({
        name: String
    });

    kittySchema.methods.speak = function () {
        const greeting = this.name
            ? "Meow name is " + this.name
            : "I don't have a name";
            console.log(greeting);
    }

    const Kitten = Mongoose.model('Kitten', kittySchema);

    // const silence = new Kitten({ name: 'Silence' });
    // silence.speak();
    // const fluffy = new Kitten({ name: 'fluffy' });
    // fluffy.speak(); // "Meow name is fluffy"

    // fluffy.save(function (err, fluffy) {
    //     if (err) return console.error(err);
    //     fluffy.speak();
    // });

    Kitten.find(function (err, kittens) {
        if (err) return console.error(err);
        console.log(kittens);
    })

    Kitten.find({ _id: '60cd30075d4deb350ce86fda' }, function (err, kittens) {
        if (err) return console.error(err);
        console.log(kittens);
    });
});

module.exports = Db;
