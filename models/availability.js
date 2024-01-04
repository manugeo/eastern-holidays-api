const mongoose = require('../db')
const softDeletePlugin = require('./plugins/softDeletePlugin')

const AvailabilitySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0 && v.getMilliseconds() === 0
      },
      message: props => `${props.value} is not a valid date. Date should have hours, min, sec & ms set to 0.`
    }
  },
  isAvailable: {
    type: Boolean,
    required: true
  },
  baseRate: {
    type: Number,
    required: true
  },
  adultRate: {
    type: Number,
    required: true
  },
  childRate: {
    type: Number,
    required: true
  },
  infantRate: {
    type: Number,
    required: true
  },
  boatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boat',
    required: true
  }
}, {
  timestamps: true
})

AvailabilitySchema.virtual('boat', {
  ref: 'Boat',
  localField: 'boatId',
  foreignField: '_id',
  justOne: true
})

AvailabilitySchema.plugin(softDeletePlugin)

AvailabilitySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    returnedObject.date = returnedObject.date.toISOString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.isDeleted
    delete returnedObject.deletedAt
  },
  virtuals: true
})

const Availability = mongoose.model('Availability', AvailabilitySchema)
module.exports = Availability