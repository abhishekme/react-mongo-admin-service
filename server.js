'use strict'

const express           = require("express");
const bodyParser        = require("body-parser");
const cors              = require("cors");
var routes              = require('./api/routes/apiRoutes.js'); //importing route
const app               = express();
const models            = require("./api/models/index");
const jsonwebtoken      = require("jsonwebtoken");
const formData          = require('express-form-data');
const path              = require('path');
const fileUpload        = require('express-fileupload');
var corsOptions = {
    origin: "http://localhost:8085"
  };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Middleware function 
app.use(fileUpload({
  useTempFiles : false,
  tempFileDir : path.join(__dirname,'tmp'),
}));

//Set token headers 
app.use(function(req, res, next) {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      jsonwebtoken.verify(req.headers.authorization.split(' ')[1], 'TOKEN!1977', function(err, decode) {
        if (err) req.user = undefined;
        req.user = decode;
        next();
      });
    } else {
      req.user = undefined;
      next();
    }
  });

app.use('/public',express.static("/public"));  //Application upload section
routes(app);

app.listen(8085, () => {
    console.log("App listening on port 8085");
});
