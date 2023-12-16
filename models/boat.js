const mongoose = require('../db')

const boatSchema = new mongoose.Schema({
  numberOfBedrooms: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return v >= 0 && v <= 10
      },
      message: 'Number of bedrooms must be between 0 and 10',
    }
  },
  boatType: {
    type: String,
    required: true,
    enum: ['deluxe', 'premium', 'luxury'],
  },
  minAdultsRequired: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return v > 0
      },
      message: 'Minimum number of adults required must be greater than 0',
    }
  },
  defaultBaseRate: {
    type: Number,
    required: true,
  },
  defaultAdultRate: {
    type: Number,
    required: true,
  },
  defaultChildRate: {
    type: Number,
    required: true,
  },
  defaultInfantRate: {
    type: Number,
    required: true,
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: true,
  },
  availabilities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Availability',
    },
  ],
})

boatSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const Boat = mongoose.model('Boat', boatSchema)
module.exports = Boat