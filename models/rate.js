const mongoose = require('mongoose')
mongoose.set('strictQuery', false)

// eslint-disable-next-line no-undef
const url = process.env.MONGODB_URI

console.log('connecting to', url)

mongoose.connect(url).then(() => {
  console.log('connected to MongoDB')
}).catch((error) => {
  console.log('error connecting to MongoDB:', error.message)
})

const rateSchema = new mongoose.Schema({
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
  }
})

rateSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    returnedObject.date = returnedObject.date.toISOString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Rate', rateSchema)