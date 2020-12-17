'use strict'

var mongoose = require("mongoose");

// Get the Schema constructor
var Schema = mongoose.Schema

// Using Schema constructor, create a UserSchema
var UserSchema = new Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: false
  },
  location: {
    type: String,
    required: false
  }, 
  user_avatar: {
    type: String,
    required: false
  }
});
UserSchema.index({'$**': 'text'});
// Create model from the schema
var User = mongoose.model("User", UserSchema);
// Export model
module.exports = User;