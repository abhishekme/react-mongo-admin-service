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
//const fs                    = require('fs');
const path                  = require('path');
const env                   = process.env.NODE_ENV || 'development';
const config                = require('../config/config.json')[env];
//const bodyParser            = require("body-parser");
const BCRYPT_SALT_ROUNDS    = 12;
//const formidable            = require('formidable');
//const { type }              = require('os');
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
 * () => API Request Method Validation
 * 
 */
exports.apiValidation   = function(req,resp){
    //console.log("Enter...bod: ", req.body);
    const errors          = validationResult(req);
    var validationErr     = [];
    var validationErrMesg = [];

    //console.log("@Valid Errorrs: ", errors);
    errors.array().forEach(error => {
        console.log("#>>> ", error, " :: ", error.param);
        let found = validationErr.filter(errItem => error.param === errItem.param);
        if (!found.length) {
          validationErr.push(error);
        }       
    });
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
    let srchObject  = {};

    if(req.query.page == undefined || req.query.limit == undefined){
        resp.status(400).json({ message: 'Parameter [limit,page] Not found.',status : 0 });
        return;
    }
    let pageNo      = parseInt(req.query.page) || 1;
    let limit       = parseInt(req.query.limit) || 10;
    let query       = {};
    query.skip      = limit * (pageNo - 1);
    query.limit     = limit;
    if(getData.query != undefined && getData.query != ''){
        userModel.count({$text: {$search: getData.query}},function(err,totalCount) {
            userModel.find({$text: {$search: getData.query}},{},query, (err, userRecord)=>{
                if(err){
                    resp.status(400).json({ message: 'Database Error!',status : 0, data: [], error: err });
                    return;
                }else {
                    let totalPages = Math.ceil(totalCount / limit);
                    resp.status(200).json({ message: 'User Lists',status : 1, data: userRecord, totalUser:totalCount, totalPage:totalPages, limit: limit });
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
    if(req.query.page == undefined || req.query.limit == undefined){
        resp.status(400).json({ message: 'Parameter [limit,page] Not found.',status : 0 });
        return;
    }  
  let pageNo    = parseInt(req.query.page) || 1;
  let limit      = parseInt(req.query.limit) || 10;
  let query     = {};
  let response;
    
    if(pageNo < 0 || pageNo === 0) {
        let response = {status : 0, message : "invalid page number, should start with 1"};
        return resp.status(401).json(response);
    }
    query.skip  = limit * (pageNo - 1);
    query.limit = limit;
    userModel.count({},function(err,totalCount) {
        userModel.find({},{},query,function(err,userRecord) {
                if(err) {
                    resp.status(400).json({ message: 'Database Error!',status : 0, data: [], error: err });
                    return;
                } else {
                    let totalPages = Math.ceil(totalCount / limit);
                    resp.status(200).json({ message: 'User Lists',status : 1, data: userRecord, totalUser:totalCount, totalPage:totalPages, limit: limit });
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
    
    var getData         = req.body || null;
    let getFiles        =   req.files || null;    
    let userAvatarFile  = '';
    let extName         = '';
    let baseName        = '';
    let uploadDir       = '';

    ///Uploading files configuration
    if(getFiles != null && typeof getFiles == 'object'){
        userAvatarFile  = req.files.file;
        extName         = path.extname(userAvatarFile.name.toString());
        baseName        = path.basename(userAvatarFile.name, extName);
        uploadDir       = path.join('public/upload/user-avatar/', userAvatarFile.name);

        let imgList = ['.png','.jpg','.jpeg','.gif'];
        // Checking the file type
        if(!imgList.includes(extName)){
            //fs.unlinkSync(userAvatarFile.tempFilePath);
           resp.status(422).json({ message: "File name should be [png|jpes|jpg|gif]", status : 0});
           return;
        }
        //Max upload size 1MB
        if(userAvatarFile.size > 1048576){
            //fs.unlinkSync(userAvatarFile.tempFilePath);
            resp.status(413).json({ message: "File size is larger, Maximum 1MB allowed", status : 0});
            return;
        }
    }
    if(typeof getData === 'object'){
        var getEmail   = getData.email || '';
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
                            getData.password = hashedPassword;                            
                            userModel.create(getData).then(insertRecord => {
                                if(insertRecord._id != undefined && insertRecord._id != ''){
                                    let userId = insertRecord._id;
                                    let updateData = {};
                                    //Uploading file
                                    if(userAvatarFile != ''){
                                        uploadDir = path.join('public/upload/user-avatar/', baseName + '_' + userId + extName);
                                        updateData['user_avatar'] = baseName + '_' + userId + extName;
                                        userAvatarFile.mv(uploadDir, (err) => {
                                            if (err){                                            
                                                resp.status(400).json({ message: "File Upload Error!", status : 0, error: err });
                                            }
                                        });                                        
                                        userModel.findOneAndUpdate({_id: userId}, updateData, function (err, userData) {
                                            console.log(">>>Update Avatar User: ", userData._id, " :: ", insertRecord._id);
                                            if(err)
                                            {
                                                resp.status(400).json({ message: "File Upload Error", status : 0, error: err });
                                                return;
                                            }
                                            if(userData._id != undefined && userData._id != ''){                                                
                                                resp.status(200).json({ message: 'Record Inserted!',status : 1, record: userData });
                                                return;
                                            }
                                        });                                
                                    }
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
                }
            });
        }
     return;
     }
}

exports.isEmptyObject = (object) => {
    for(let key in object){
        if(object.hasOwnProperty(key)){
            return false;
        }
    }
    return true;
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

    console.log(">>GET POST: ",  " == ", req.method, " ::: ", req.files, " :: ", req.body );

    //return;
    var validReturn   = theController.apiValidation(req, resp);
    if(validReturn) return;


    let getData     =   req.body || null;
    let getParams   =   req.query || null;
    let getFiles    =   req.files || null;    
    let userId          = '';
    let userAvatarFile  = '';
    let extName = '';
    let baseName = '';
    let uploadDir = '';

    ///Uploading files configuration
    if(getFiles != null && typeof getFiles == 'object'){
        userAvatarFile = req.files.file;
        console.log("Uploading file: ", userAvatarFile, " -- ", userAvatarFile.name);
        extName = path.extname(userAvatarFile.name.toString());
        baseName = path.basename(userAvatarFile.name, extName);
        uploadDir = path.join('public/upload/user-avatar/', userAvatarFile.name);

        let imgList = ['.png','.jpg','.jpeg','.gif'];
        // Checking the file type
        if(!imgList.includes(extName)){
            //fs.unlinkSync(userAvatarFile.tempFilePath);
           resp.status(422).json({ message: "File name should be [png|jpes|jpg|gif]", status : 0});
           return;
        }
        //Max upload size 1MB
        if(userAvatarFile.size > 1048576){
            //fs.unlinkSync(userAvatarFile.tempFilePath);
            resp.status(413).json({ message: "File size is larger, Maximum 1MB allowed", status : 0});
            return;
        }
    }

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
                                
                                //Uploading file
                                if(userAvatarFile != ''){
                                    uploadDir = path.join('public/upload/user-avatar/', baseName + '_' + userId + extName);
                                    getData['user_avatar'] = baseName + '_' + userId + extName;
                                    console.log(">>>File: ", getData);
                                    userAvatarFile.mv(uploadDir, (err) => {
                                        if (err){                                            
                                            resp.status(400).json({ message: "File Upload Error!", status : 0, error: err });
                                        }
                                    });
                                }
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
                            //Uploading file
                            if(userAvatarFile != ''){
                                uploadDir = path.join('public/upload/user-avatar/', baseName + '_' + userId + extName);
                                getData['user_avatar'] = baseName + '_' + userId + extName;
                                console.log(">>>File: ", getData);
                                userAvatarFile.mv(uploadDir, (err) => {
                                    if (err){                                            
                                        resp.status(400).json({ message: "File Upload Error!", status : 0, error: err });
                                    }
                                });
                            }
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

                    //Uploading file
                    uploadDir = path.join('public/upload/user-avatar/', baseName + '_' + userId + extName);
                    getData['user_avatar'] = baseName + '_' + userId + extName;
                    console.log(">>>File: ", getData);
                    userAvatarFile.mv(uploadDir, (err) => {
                        if (err){                                            
                            resp.status(400).json({ message: "File Upload Error!", status : 0, error: err });
                        }
                    });
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