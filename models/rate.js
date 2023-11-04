const mongoose = require('mongoose')
mongoose.set('strictQuery', false)

const url = process.env.MONGODB_URI

console.log('connecting to', url)

mongoose.connect(url).then(() => {
  console.log('connected to MongoDB') 
}).catch((error) => {
  console.log('error connecting to MongoDB:', error.message)
})

const rateSchema = new mongoose.Schema({
  date: Date,
  baseRate: Number,
  adultRate: Number,
  childRate: Number,
  infantRate: Number
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