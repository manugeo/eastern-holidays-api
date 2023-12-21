const availabilitiesRouter = require('express').Router()
const { default: mongoose } = require('mongoose')
const Availability = require('../models/availability')
const Boat = require('../models/boat')
const { requiredFeilds } = require('../tests/helper')
const { isValidDateString } = require('../utils/utils')
const logger = require('../utils/logger')

availabilitiesRouter.get('/', async (req, res) => {
  const availabilities = await Availability.find({})
  res.json(availabilities)
})

availabilitiesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const availability = await Availability.findById(id)
  if (availability) {
    res.json(availability)
  } else {
    res.status(404).json({ error: 'Availability not found' })
  }
})

availabilitiesRouter.get('/boat/:id', async (req, res) => {
  const id = req.params.id
  const availabilities = await Availability.find({ boat: id })
  if (!availabilities) {
    res.status(404).json({ error: 'availabilities not found' })
  }
  else {
    res.json(availabilities)
  }
})

// Todo: Handle new boat property. Make sure to update the corresponding boat object as well.
availabilitiesRouter.post('/', async (req, res) => {
  const body = req.body
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate, boat } = body
  for (const field of requiredFeilds.availability) {
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  if (!isValidDateString(date)) {
    res.status(400).json({ error: 'Invalid date format' })
  }
  else if (typeof isAvailable !== 'boolean') {
    res.status(400).json({ error: 'isAvailable must be a boolean' })
  }
  else {
    const isBoatIdValid = mongoose.Types.ObjectId.isValid(boat)
    if (!isBoatIdValid) {
      res.status(400).json({ error: 'Invalid boat id' })
    }
    else {
      const boatInDb = await Boat.findById(boat)
      if (!boatInDb) {
        res.status(404).json({ error: 'Boat not found' })
      }
      else {
        const availability = new Availability({
          date: new Date(date).setHours(0, 0, 0, 0),
          isAvailable,
          baseRate,
          adultRate,
          childRate,
          infantRate: infantRate || 0,
          boat
        })
        const savedAvailability = await availability.save()
        // Note: 'boatInDb' needs to be updated as well.
        boatInDb.availabilities = [...boatInDb.availabilities, savedAvailability._id]
        await boatInDb.save()
        res.status(201).json(savedAvailability)
      }
    }
  }
})

availabilitiesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate } = req.body
  for (const field of requiredFeilds.availability) {
    if (field === 'boat') continue
    // eslint-disable-next-line eqeqeq
    if (req.body[field] == null) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  if (!isValidDateString(date)) {
    res.status(400).json({ error: 'Invalid date format' })
  }
  else if (typeof isAvailable !== 'boolean') {
    res.status(400).json({ error: 'isAvailable must be a boolean' })
  }
  else {
    const availability = {
      date: new Date(date).setHours(0, 0, 0, 0),
      isAvailable: isAvailable,
      baseRate: baseRate,
      adultRate: adultRate,
      childRate: childRate,
      infantRate: infantRate || 0,
      // Note: An availabiliy's boat cannot be changed.
    }
    const updatedAvailability = await Availability.findByIdAndUpdate(id, availability, { new: true, runValidators: true, context: 'query' })
    if (!updatedAvailability) {
      res.status(404).json({ error: 'Availability not found' })
    }
    else {
      res.json(updatedAvailability)
    }
  }
})

availabilitiesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  // Note: For some reason 'Rate.findByIdAndRemove' does not work. But 'Rate.findByIdAndDelete' does.
  // See: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
  // No 'findByIdAndRemove' method is present here.
  const deletedAvailability = await Availability.findByIdAndDelete(id)
  if (deletedAvailability) {
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Availability not found' })
  }
})

availabilitiesRouter.delete('/boat/:id', async (req, res) => {
  const id = req.params.id
  const deletedAvailabilities = await Availability.deleteMany({ boat: id })
  if (!deletedAvailabilities) {
    logger.error('Failed to delete boat availabilities!')
    res.status(404).json({ error: 'availabilities not found' })
  }
  else {
    res.status(204).end()
  }
})

module.exports = availabilitiesRouter