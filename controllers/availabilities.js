const availabilitiesRouter = require('express').Router()
const { default: mongoose } = require('mongoose')
const Availability = require('../models/availability')
const Boat = require('../models/boat')
const { requiredFeilds } = require('../tests/helper')
const { isValidDateString } = require('../utils/utils')
const logger = require('../utils/logger')

// Note: Not populating 'boat' property here.
availabilitiesRouter.get('/', async (req, res) => {
  const availabilities = await Availability.find({})
  res.json(availabilities)
})

availabilitiesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const availability = await Availability.findById(id).populate('boat')
  if (availability) {
    res.json(availability)
  } else {
    res.status(404).json({ error: 'Availability not found' })
  }
})

availabilitiesRouter.get('/boat/:id', async (req, res) => {
  const boatId = req.params.id
  const availabilities = await Availability.find({ boatId })
  if (!availabilities || availabilities.length === 0) {
    res.status(404).json({ error: 'Availabilities not found' })
  }
  else {
    res.json(availabilities)
  }
})

availabilitiesRouter.post('/', async (req, res) => {
  const body = req.body
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate, boatId } = body
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
    const isBoatIdValid = mongoose.Types.ObjectId.isValid(boatId)
    if (!isBoatIdValid) {
      res.status(400).json({ error: 'Invalid boatId' })
    }
    else {
      const boatInDb = await Boat.findById(boatId)
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
          boatId
        })
        const savedAvailability = await availability.save()
        if (!savedAvailability) {
          logger.error('Failed to create availability!')
          res.status(500).json({ error: 'Failed to create availability' })
        }
        else {
          // Housekeeping!
          // 1. Update boat's availabilityIds
          boatInDb.availabilityIds = [...boatInDb.availabilityIds, savedAvailability._id]
          const savedBoat = await boatInDb.save()
          if (!savedBoat) {
            logger.error(`Failed to update boat with automatically created new availability. Boat id: ${boatId}`)
          }

          // Todo: Return availability with 'boat' populated(manually).
          res.status(201).json(savedAvailability)
        }
      }
    }
  }
})

availabilitiesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate } = req.body
  // Todo: Update only the fields supplied. Take rest from the original doc.
  for (const field of requiredFeilds.availability) {
    if (field === 'boatId') continue //Since 'boatId' prop cannot be updated after creation.
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
      // Note: An availabiliy's boatId cannot be changed.
    }
    const updatedAvailability = await Availability.findByIdAndUpdate(id, availability, { new: true, runValidators: true, context: 'query' })
    if (!updatedAvailability) {
      res.status(404).json({ error: 'Availability not found' })
    }
    else {
      // Todo: Return availability with 'boat' populated(manually).
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
    // Housekeeping!
    // 1. Update boat's availabilityIds
    const boatId = deletedAvailability.boatId
    const boatInDb = await Boat.findById(boatId)
    if (!boatInDb) {
      logger.error(`Failed to update boat's availabilityIds. Boat not found: ${boatId}`)
    }
    else {
      boatInDb.availabilityIds = boatInDb.availabilityIds.filter(id => id.toString() !== deletedAvailability._id.toString())
      await boatInDb.save()
    }

    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Availability not found' })
  }
})

availabilitiesRouter.delete('/boat/:id', async (req, res) => {
  const id = req.params.id
  const deletedAvailabilities = await Availability.deleteMany({ boatId: id })
  if (!deletedAvailabilities) {
    logger.error(`Failed to delete availabilities for boat: ${id}`)
    res.status(404).json({ error: 'availabilities not found' })
  }
  else {
    // Housekeeping!
    // 1. Update boat's availabilityIds
    const boatInDb = await Boat.findById(id)
    if (!boatInDb) {
      logger.error(`Failed to update boat's availabilityIds. Boat not found: ${id}`)
    }
    else {
      boatInDb.availabilityIds = []
      await boatInDb.save()
    }
    res.status(204).end()
  }
})

module.exports = availabilitiesRouter