'use strict'

//Allow mongo db to connect.
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];

var mongoose    = require("mongoose");
let dbURL       = config.dialect + "://"+config.host+"/"+config.database;  
console.log(">>> db: ", dbURL);
mongoose.connect(dbURL, { useNewUrlParser: true });



