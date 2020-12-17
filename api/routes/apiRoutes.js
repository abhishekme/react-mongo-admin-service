'use strict'

//Declare controlers
const userController = require("../controller/userController");

module.exports = function(app) { 
  // Routes
  //Welcome Application route
  app.get("/", function(req, res) { 
    res.send("Hello Node \_/");
  });

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
};