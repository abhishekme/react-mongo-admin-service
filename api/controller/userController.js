'use strict'

var userController          = require('./userController');
var constants               = require('../config/constant');
const { body,validationResult,check } = require('express-validator');
const jwt                   = require('jsonwebtoken');
const bcrypt                = require('bcrypt');
//Get ORM object Mongoose
const userModel             = require('../models/userModel');
const theController         = userController;      
const theConstant           = constants[0].application;
const fs                    = require('fs');
const env                   = process.env.NODE_ENV || 'development';
const config                = require('../config/config.json')[env];
const bodyParser        = require("body-parser");
const BCRYPT_SALT_ROUNDS = 12;
const formidable = require('formidable');
const { type } = require('os');
//Declare controller methods

//-----------------------------------------------------------------------
//---------------- API Required Field Validation ------------------------
//-----------------------------------------------------------------------
exports.validate = (method) => {
    switch (method) {
      case 'create' : {
       return [ 
          body('firstName', theConstant.variables.first_name_required).exists(),
          body('lastName', theConstant.variables.last_name_required).exists(),
          body('userName', theConstant.variables.username_required).exists(),
          body('email', theConstant.variables.email_required).exists().isEmail(),
          body('password')  
              .exists().withMessage(theConstant.variables.password_required)
              .isLength({ min: 5, max:15 }).withMessage(theConstant.variables.password_strength_step1)
              .matches(/^((?=.*\d)(?=.*[A-Z])(?=.*\W).{5,15})$/).withMessage(theConstant.variables.password_strength_step2),
         ]   
      }
      case 'login' : {
        return [ 
           body('email', theConstant.variables.email_required).exists().isEmail(),
           body('password', theConstant.variables.password_required).exists(),
          ]   
       }
       case 'search' : {
        return [ 
           body('email', theConstant.variables.email_required).exists().isEmail(),
           body('password', theConstant.variables.password_required).exists(),
          ]   
       }
      case 'update' : {
        return [ 
            body('firstName', theConstant.variables.first_name_required).exists(),
            body('lastName', theConstant.variables.last_name_required).exists(),
            body('userName', theConstant.variables.username_required).exists(),
            body('email', theConstant.variables.email_required).exists().isEmail(),
          ]   
       }
    }
}

/***********************************
 * () => API POST Request Validation
 * 
 */
exports.apiValidation   = function(req,resp){
    console.log("Enter...bod: ", typeof req.body);
    const errors          = validationResult(req);
    var validationErr     = [];
    var validationErrMesg = [];
    errors.array().forEach(error => {
        let found = validationErr.filter(errItem => error.param === errItem.param);
        if (!found.length) {
          validationErr.push(error);
        }       
    });
    console.log(validationErr);
    if(validationErr.length){
      validationErr.forEach(rec => {
         validationErrMesg.push({field: rec.param, message: rec.msg});
      })
      resp.status(422).json({ errors: validationErrMesg, status:0 });
      return true;
    }
    return false;
}
  //-----------------------------------------------------------------------
  //-----------------API Required Field Validation ------------------------
  //-----------------------******** END ********** ------------------------
  //-----------------------------------------------------------------------

//Search User
/****************
 * () => UserSearch Fulltext
 * @page    -   pageNumber - optional
 * @size    -   limit - optional
 * 
 */
exports.searchUser  =   (req, resp) => {
    let getData = req.body || null;
    let srchObject = {};
    let pageNo    = parseInt(req.query.page) || 1;
    let size      = parseInt(req.query.size) || 10;
    let query     = {};
    query.skip = size * (pageNo - 1);
    query.limit = size;
    console.log("sss ",srchObject);

    if(getData.query != undefined && getData.query != ''){
        userModel.count({$text: {$search: getData.query}},function(err,totalCount) {
            userModel.find({$text: {$search: getData.query}},{},query, (err, userRecord)=>{
                if(err){
                    resp.status(400).json({ message: 'Database Error!',status : 0, data: [], error: err });
                    return;
                }else {
                    let totalPages = Math.ceil(totalCount / size);
                    resp.status(200).json({ message: 'User Lists',status : 1, data: userRecord, totalUser:totalCount, totalPage:totalPages, limit: size });
                    return;
                }
            })
        });
    }else{
        theController.getUserList(req,resp);
    }
            
}

/****************
 * () => UserList
 * @page    -   pageNumber
 * @size    -   limit
 * 
 */
exports.getUserList  =  (req, resp)  =>{
  let pageNo    = parseInt(req.query.page) || 1
  let size      = parseInt(req.query.size) || 10
  let query     = {};
  let response;
    if(pageNo < 0 || pageNo === 0) {
        let response = {status : 0, message : "invalid page number, should start with 1"};
        return resp.status(401).json(response);
    }
    query.skip = size * (pageNo - 1);
    query.limit = size;
    userModel.count({},function(err,totalCount) {
        userModel.find({},{},query,function(err,userRecord) {
                if(err) {
                    resp.status(400).json({ message: 'Database Error!',status : 0, data: [], error: err });
                    return;
                } else {
                    let totalPages = Math.ceil(totalCount / size);
                    resp.status(200).json({ message: 'User Lists',status : 1, data: userRecord, totalUser:totalCount, totalPage:totalPages, limit: size });
                    return;
                }
            });
        });
}

//API Guard
/****************
 * () => APIGuard
 * require Token from headers
 */
exports.authRequired = function(req, res, next) {
    if (req.user) {
      next();
    } else {  
      return res.status(401).json({ status: 0, message: 'Valid Token Required!' });
    }
  };

  exports.checkHash = (userPassword, dbPassword) =>{
    return bcrypt.compare(userPassword, dbPassword);
  }

//Login User
/****************
 * () => userLogin
 * @body     -   POST Body Data
 * @email    -   valid email - required
 * @password -   valid password - required
 * 
 */
exports.login   =   (req, resp) => {
    var validReturn   = theController.apiValidation(req, resp);
    if(validReturn) return;

    let getData       = req.body || null;
    userModel.findOne({
        email: getData.email
      }, function(err, user) {
        if (err){
            resp.status(400).json({ message: "Login Error!", status : 0, error: err });
            return;
        }
        if(user != null && user.email == getData.email){
            //Checked HASH Password
            let checkPassword = theController.checkHash(getData.password, user.password);
            console.log("Check Password: ", checkPassword);
            if(checkPassword){
                checkPassword.then(passPassword => {
                     if(!passPassword){
                        resp.status(400).json({ message: "Password not matched, please try again", status : 0 });
                        return; 
                     }else{
                        return resp.json({ status: 1, message:"Login Success",token: jwt.sign({ email: user.email, firstName: user.firstName, _id: user._id }, 'TOKEN!1977') });
                     }
                })
            }
            // if(user.password != getData.password){
            //     resp.status(400).json({ message: "Password not matched, please try again", status : 0 });
            //     return; 
            // }else{
            //     return resp.json({ status: 1, message:"Login Success",token: jwt.sign({ email: user.email, firstName: user.firstName, _id: user._id }, 'RESTFULAPIs') });
            // }
        }else{
            resp.status(400).json({ message: "Login Error!, Check Your Email and Password", status : 0 });
            return;
        }
      });
}

//Add User
/****************
 * () => userCreate
 * @body     -   POST Body Data
 * All model field data
 * @firstName   -   required   
 * @lastName    -   required
 * @email       -   required   
 * @userName    -   required
 * @password    -   required
 * 
 */
exports.create  = (req, resp, next) => {    

    

    //Add required validation
    var validReturn   = theController.apiValidation(req, resp);
    if(validReturn) return;
    
        var getData    = req.body || null;
    if(typeof getData === 'object'){
        var getEmail   = getData.email || '';
        //var getUserName    = getData.username;
        if(getEmail){
           userModel.find({email: getEmail}, function(err, user) 
            {
                if(err)
                {
                    resp.status(400).json({ message: theConstant.variables.record_add_exception, record : user, error: err });
                    return;
                }
                if(user.length > 0){
                    resp.status(400).json({ message: theConstant.variables.email_or_username_exists, record : user });
                    return;
                }
                if(user.length == 0){
                    //Create HASH Password
                    bcrypt.hash(getData.password, BCRYPT_SALT_ROUNDS)
                        .then(function(hashedPassword) {
                            console.log("#Password: ", getData.password, " :: ", hashedPassword);
                            //return usersDB.saveUser(username, hashedPassword);
                            getData.password = hashedPassword;
                            userModel.create(getData).then(insertRecord => {
                                if(insertRecord._id != undefined && insertRecord._id != ''){
                                    resp.status(200).json({ message: 'Record Inserted!',status : 1, record: insertRecord });
                                    return;
                                }
                            })
                        })
                    .then(function() {
                        //Do something
                    })
                    .catch(function(err){
                        resp.status(400).json({ message: "DB Insert Error!", status : 0, error: err });
                        next();
                    });
                    // return;
                    // userModel.create(getData).then(insertRecord => {
                    //     if(insertRecord._id != undefined && insertRecord._id != ''){
                    //         resp.status(200).json({ message: 'Record Inserted!',status : 1, record: insertRecord });
                    //         return;
                    //     }
                    // })
                }
            });
        }
     return;
     }
}

exports.isEmptyObject = (object) =>{
    for(let key in object){
        //console.log(">> ",key, " -- ", object[key]);
        if(object.hasOwnProperty(key)){
            return false;
        }
    }
    return true;
}

exports.formValidation =(bodyData, resp) =>{
    let error = [];
    // resp.status(400).json({ message: "Delete: id params required", status : 0});
    console.log("@Response: ", bodyData);
    if(bodyData.post != undefined && typeof bodyData.post == 'object'){
        bodyData = bodyData.post;
        if(bodyData.firstName == undefined || bodyData.firstName == null || bodyData.firstName === ''){
            error.push({
                field : 'firstName',
                message : 'FirstName is required'
            })
        }
        if(bodyData.lastName == undefined || bodyData.lastName == null || bodyData.lastName === ''){
            error.push({
                field : 'lastName',
                message : 'LastName is required'
            })
        }
        if(bodyData.userName == undefined || bodyData.userName == null || bodyData.userName === ''){
            error.push({
                field : 'userName',
                message : 'UserName is required'
            })
        }
        if(bodyData.email == undefined || bodyData.email == null || bodyData.email === ''){
            error.push({
                field : 'email',
                message : 'Email is required'
            })
        }
    }
    if(error.length > 0){
        console.log("Error occured....", error);
        return resp.status(400).json({errors: error, status: 0})
    }
}

//Update User
/**************** 
 * () => userUpdate
 * @body     -   POST Body Data
 * Query Params /?id
 * All model field data
 * @firstName   -   required   
 * @lastName    -   required
 * @email       -   required   
 * @userName    -   required
 * 
 */
exports.update  = (req, resp, next) => {    

    console.log(">>GET POST: ",  " == ", req.method);

    /*let bodyData = {};
    bodyData['post'] =[];
    bodyData['file'] ={};
    var form = formidable({ multiples: true });
      //console.log(">>>Formidable: ", form);
    // form.parse analyzes the incoming stream data, picking apart the different fields and files for you.
    form.parse(req, function(err, fields, files) {
      if (err) {
        console.error(err.message);
        return;
      }
      console.log(">>> Fields: ", fields, " -- ", typeof fields, " ::: ", req.query, "...", files);
      if(typeof fields == 'object'){
        bodyData['post'] = fields;
      }
      if(typeof files == 'object'){
        bodyData['file'] = files;
      }
      req.body = bodyData['post'];
      
    //   theController.validate('update')
      
    theController.formValidation(bodyData, resp);

    return;*/

    var validReturn   = theController.apiValidation(req, resp);
    if(validReturn) return;


    let getData     = req.body || null;
    let getParams   = req.query || null;
    let userId      = '';
    if(getParams != undefined && typeof getParams === 'object'){
        if(getParams.id === undefined){
            resp.status(400).json({ message: "Update: id params required", status : 0});
            return;
        }
        if(getParams.id !== undefined && getParams.id == ''){
            resp.status(400).json({ message: "Update: id params should be a Valid ID value", status : 0});
            return;
        }
        userId = getParams.id;
    }
    console.log(">>>> params: ", getParams, " :: ", userId);

    if(typeof getData === 'object'){
        var getEmail       = getData.email || '';
        //var getUserName    = getData.username;
        if(getEmail){
           userModel.find({email : getEmail}, function(err, user) 
            {
                if(err)
                {
                    resp.status(400).json({ message: theConstant.variables.record_add_exception, record : user, error: err });
                    return;
                }                
                if(user.length > 0){
                    //check user email
                    let findData = user[0];
                    console.log(">>> found: ", user, " [- ", findData._id);
                    if(findData._id != userId){
                        resp.status(400).json({ message: theConstant.variables.email_or_username_exists, record : user });
                        return;
                    }
                    if(findData._id == userId){
                        console.log("Need to update....");
                        if(getData.password != undefined && getData.password != null && getData.password != ''){
                            bcrypt.hash(getData.password, BCRYPT_SALT_ROUNDS)
                            .then(function(hashedPassword) {
                                console.log("#Password: ", getData.password, " :: ", hashedPassword);
                                //return usersDB.saveUser(username, hashedPassword);
                                getData.password = hashedPassword;
                                userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
                                    console.log(">>>Update User: ", userData);
                                    if(err)
                                    {
                                        resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
                                        return;
                                    }
                                    if(userData._id != undefined && userData._id != ''){
                                        resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
                                        return;
                                    }
                                });                                
                            })
                        .then(function() {
                            //Do something
                        })
                        .catch(function(err){
                            resp.status(400).json({ message: "DB Update Error!", status : 0, error: err });
                            next();
                        });

                        }else{
                            userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
                                console.log(">>>Update User: ", userData);
                                if(err)
                                {
                                    resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
                                    return;
                                }
                                if(userData._id != undefined && userData._id != ''){
                                    resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
                                    return;
                                }
                            });                        
                        }
                    
                    }
                }else{
                    console.log("@@@@@@@@Need to update....");
                    userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
                        console.log(">>>Update User: ", userData);
                        if(err)
                        {
                            resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
                            return;
                        }
                        if(userData == null){
                            resp.status(400).json({ message: "DB Update Error::Please request a valid ID", status : 0, error: err });
                            return;
                        }
                        if(userData._id != undefined && userData._id != ''){
                            resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
                            return;
                        }
                    });
                }                
            });
        }
     return;
     }
      
      
    ///});   
    
    // return;
    //Add required validation
    //var validReturn   = theController.apiValidation(req, resp);
    //if(validReturn) return;
    
    // let getData     = req.body || null;
    // let getParams   = req.query || null;
    // let userId      = '';
    // if(getParams != undefined && typeof getParams === 'object'){
    //     if(getParams.id === undefined){
    //         resp.status(400).json({ message: "Delete: id params required", status : 0});
    //         return;
    //     }
    //     if(getParams.id !== undefined && getParams.id == ''){
    //         resp.status(400).json({ message: "Delete: id params should be a Valid ID value", status : 0});
    //         return;
    //     }
    //     userId = getParams.id;
    // }
    // console.log(">>>> params: ", getParams, " :: ", userId);

    // if(typeof getData === 'object'){
    //     var getEmail       = getData.email || '';
    //     //var getUserName    = getData.username;
    //     if(getEmail){
    //        userModel.find({email : getEmail}, function(err, user) 
    //         {
    //             if(err)
    //             {
    //                 resp.status(400).json({ message: theConstant.variables.record_add_exception, record : user, error: err });
    //                 return;
    //             }                
    //             if(user.length > 0){
    //                 //check user email
    //                 let findData = user[0];
    //                 console.log(">>> found: ", user, " [- ", findData._id);
    //                 if(findData._id != userId){
    //                     resp.status(400).json({ message: theConstant.variables.email_or_username_exists, record : user });
    //                     return;
    //                 }
    //                 if(findData._id == userId){
    //                     console.log("Need to update....");
    //                     if(getData.password != undefined && getData.password != null && getData.password != ''){
    //                         bcrypt.hash(getData.password, BCRYPT_SALT_ROUNDS)
    //                         .then(function(hashedPassword) {
    //                             console.log("#Password: ", getData.password, " :: ", hashedPassword);
    //                             //return usersDB.saveUser(username, hashedPassword);
    //                             getData.password = hashedPassword;
    //                             userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
    //                                 console.log(">>>Update User: ", userData);
    //                                 if(err)
    //                                 {
    //                                     resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
    //                                     return;
    //                                 }
    //                                 if(userData._id != undefined && userData._id != ''){
    //                                     resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
    //                                     return;
    //                                 }
    //                             });                                
    //                         })
    //                     .then(function() {
    //                         //Do something
    //                     })
    //                     .catch(function(err){
    //                         resp.status(400).json({ message: "DB Update Error!", status : 0, error: err });
    //                         next();
    //                     });

    //                     }else{
    //                         userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
    //                             console.log(">>>Update User: ", userData);
    //                             if(err)
    //                             {
    //                                 resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
    //                                 return;
    //                             }
    //                             if(userData._id != undefined && userData._id != ''){
    //                                 resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
    //                                 return;
    //                             }
    //                         });                        
    //                     }
                    
    //                 }
    //             }else{
    //                 console.log("@@@@@@@@Need to update....");
    //                 userModel.findOneAndUpdate({_id: userId}, getData, function (err, userData) {
    //                     console.log(">>>Update User: ", userData);
    //                     if(err)
    //                     {
    //                         resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
    //                         return;
    //                     }
    //                     if(userData == null){
    //                         resp.status(400).json({ message: "DB Update Error::Please request a valid ID", status : 0, error: err });
    //                         return;
    //                     }
    //                     if(userData._id != undefined && userData._id != ''){
    //                         resp.status(200).json({ message: 'Record Updated!',status : 1, record: userData });
    //                         return;
    //                     }
    //                 });
    //             }                
    //         });
    //     }
    //  return;
    //  }
}

//Delete User
/****************
 * () => userUpdate
 * @body     -   NULL
 * Query Params /?id
 * 
 */
exports.delete  = (req, resp, next) => {    
    
    let getParams   = req.query || null;
    let userId      = '';
    if(getParams != undefined && typeof getParams === 'object'){
        //console.log(">>> ID: ", getParams.id);
        if(getParams.id === undefined){
            resp.status(400).json({ message: "Delete: id params required", status : 0});
            return;
        }
        if(getParams.id !== undefined && getParams.id == ''){
            resp.status(400).json({ message: "Delete: id params should be a Valid ID value", status : 0});
            return;
        }
        userId      = getParams.id;
    }
    if(userId != ''){
        userModel.findOneAndDelete({_id: userId}, function (err) {
            if(err)
            {
                resp.status(400).json({ message: "DB Update Error", status : 0, error: err });
                return;
            }
            //console.log("Successful deletion");
            resp.status(200).json({ message: 'Record Deleted!',status : 1 });
             return;
          });
    }
}