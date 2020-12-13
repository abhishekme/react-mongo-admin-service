'use strict'

//Declare controlers
const userController = require("../controller/userController");

module.exports = function(app) { 
  // Routes
  //Welcome route
  app.get("/", function(req, res) { 
    res.send("Hello Node \_/");
  });

  // var parseData = (req, res, next) => { 
  //   if (req.method === 'POST' || req.method === 'PUT') { 
  //     console.log(".....");
  //       const formData = {} 
  //       req.on('data', data => { 
  
  //           // Decode and parse data 
  //           const parsedData =  
  //               decodeURIComponent(data).split('&') 
  
  //           for (let data of parsedData) { 
  
  //               decodedData = decodeURIComponent( 
  //                       data.replace(/\+/g, '%20')) 
  
  //               const [key, value] =  
  //                       decodedData.split('=') 
  
  //               // Accumulate submitted  
  //               // data in an object
  //               console.log(">> ", key, " - ", value); 
  //               formData[key] = value 
  //           } 
  
  //           // Attach form data in request object 
  //           req.body = formData 
  //           next() 
  //       }) 
  //   } else { 
  //       next() 
  //   } 
  // }

    //REST API Routes
    app.route('/user')
      .get(userController.authRequired, userController.getUserList)
      .post(userController.validate('create'), userController.create)
      .put(userController.authRequired, userController.validate('update'), userController.update) 
      .delete(userController.authRequired, userController.delete) 
    app.route('/user/:id')
        .put(userController.authRequired, userController.validate('update'), userController.update)
    app.route('/user/:id')
        .delete(userController.authRequired, userController.delete)
    app.route('/user/search')
      .post(userController.authRequired, userController.searchUser)
    app.route('/login')
      .post(userController.validate('login'), userController.login) 

  ////app.get("/users-list", function(req,res) {

    // userModel.find({name:'abhishek'})
    // .then(function(dbProducts) {
    //   res.json(dbProducts);
    // })
    // .catch(function(err) {
    //   res.json(err);
    // })
  //});

};