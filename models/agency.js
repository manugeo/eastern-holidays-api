const mongoose = require('../db')
const uniqueValidator = require('mongoose-unique-validator')

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minLength: 2,
    maxLength: 25
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    minLength: 10,
    maxLength: 10,
    match: /^\d{10}$/
  },
  boats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boat'
    }
  ]
})

agencySchema.plugin(uniqueValidator)

agencySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Agency = mongoose.model('Agency', agencySchema)
module.exports = Agency