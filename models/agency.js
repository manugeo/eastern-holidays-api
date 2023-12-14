const mongoose = require('../db')

const agencySchema = new mongoose.Schema({
  name: String,
  boats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boat'
    }
  ]
})

agencySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Agency = mongoose.model('Agency', agencySchema)
module.exports = Agency