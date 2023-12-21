const mongoose = require('../db')
const uniqueValidator = require('mongoose-unique-validator')

const AgencySchema = new mongoose.Schema({
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
  boatIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boat'
    }
  ]
})

AgencySchema.virtual('boats', {
  ref: 'Boat',
  localField: '_id',
  foreignField: 'agencyId'
})

AgencySchema.plugin(uniqueValidator)

AgencySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
  virtuals: true
})

const Agency = mongoose.model('Agency', AgencySchema)
module.exports = Agency