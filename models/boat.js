const mongoose = require('../db')
const softDeletePlugin = require('./plugins/softDeletePlugin')

const BoatSchema = new mongoose.Schema({
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
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: true,
  },
  availabilityIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Availability',
    },
  ]
}, {
  timestamps: true
})

BoatSchema.virtual('agency', {
  ref: 'Agency',
  localField: 'agencyId',
  foreignField: '_id',
  justOne: true,
})
BoatSchema.virtual('availabilities', {
  ref: 'Availability',
  localField: '_id',
  foreignField: 'boatId',
  justOne: false,
})

BoatSchema.plugin(softDeletePlugin)

BoatSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.isDeleted
    delete returnedObject.deletedAt
  },
  virtuals: true,
})

const Boat = mongoose.model('Boat', BoatSchema)
module.exports = Boat