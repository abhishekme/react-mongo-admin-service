'use strict'

module.exports  = 
[
    {
        "application" : 
        {   
            "serverPath" : {
                "imageDir"                      : "./public/",
                "userUploadDir"                 : "./public/user-pic/",
            },      
            "variables": {
                "first_name_required"           : "First name is required",
                "last_name_required"            : "Last name is required",
                "username_required"             : "Username is required",
                "email_required"                : "Email is required, should be valid",
                "email_or_username_exists"      : "Email Exists! please try another",
                "record_add_exception"          :  "Unexceptional DB Error!",
                "id_not_found"                  : "ID Not Found",
                "user_picture_extension"        : ".jpg",
                "image_upload_max_size"         : "Maximum upload image 2MB",
                "user_picture_upload_encoding"  : "base64",
                "password_required"             : "Password is required",
                "password_strength_step1"       : "Should be minimum 5 and maximum 15 character long.",
                "password_strength_step2"       : "Password should not be empty, minimum 5 characters maximum 15, at least one capital letter, one number and one special character",
                
                "record_inserted"               : "Record Inserted Succesfully",
                "record_updated"                : "Record Updated Succesfully",
                "record_update_error"           : "Database Update Error",
                "record_deleted"                : "Record Deleted Succesfully",
                "record_deleted_error"          : "Record Already Deleted",

                "logout_success"                :  "Logout Successfully, Please login again",
                "logout_unSuccess"              :  "Logout Unsuccessfull, Please try again",
                "logged_in"                     :  "You Logged In",
                "logged_out"                    :  "Please login again",
            }
        },
  }
]