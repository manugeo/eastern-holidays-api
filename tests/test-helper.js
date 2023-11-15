const Rate = require('../models/rate')

const initialRates = [
  {
    date: '2023-09-02T18:30:00.000Z',
    baseRate: 9000,
    adultRate: 500,
    childRate: 300,
    infantRate: 0
  },
  {
    date: '2022-05-02T18:30:00.000Z',
    baseRate: 12000,
    adultRate: 700,
    childRate: 450,
    infantRate: 0
  }
]
const aValidRate = {
  date: '2023-09-02T18:30:00.000Z',
  baseRate: 9000,
  adultRate: 500,
  childRate: 300,
  infantRate: 0
}

const nonExistingId = async () => {
  const note = new Rate(initialRates[0])
  await note.save()
  await note.deleteOne()
  return note._id.toString()
}

const ratesInDb = async () => {
  const notes = await Rate.find({})
  return notes.map(note => note.toJSON())
}

module.exports = {
  initialRates, aValidRate, nonExistingId, ratesInDb
}