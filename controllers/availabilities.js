const availabilitiesRouter = require('express').Router()
const { default: mongoose } = require('mongoose')
const Availability = require('../models/availability')
const Boat = require('../models/boat')
const { isValidDateString, getAllFieldsFromSchema, getRequiredFieldsFromSchema } = require('../utils/utils')
const logger = require('../utils/logger')

availabilitiesRouter.get('/', async (req, res) => {
  const availabilities = await Availability.find({ isDeleted: false })
  res.json(availabilities)
})

availabilitiesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const availability = await Availability.findOne({ _id: id, isDeleted: false }).populate('boat')
  if (availability) {
    res.json(availability)
  } else {
    res.status(404).json({ error: 'Availability not found' })
  }
})

availabilitiesRouter.get('/boat/:id', async (req, res) => {
  const boatId = req.params.id
  const availabilities = await Availability.find({ boatId, isDeleted: false })
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
  const requiredFeilds = getRequiredFieldsFromSchema(Availability.schema)
  for (const field of requiredFeilds) {
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
            logger.error(`Failed to update boat with newly created availability. Boat id: ${boatId}, availability id: ${savedAvailability._id}`)
          }

          savedAvailability.boat = savedBoat
          res.status(201).json(savedAvailability)
        }
      }
    }
  }
})

availabilitiesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body
  const availabilityToBeUpdated = await Availability.findOne({ _id: id, isDeleted: false }).populate('boat')
  if (!availabilityToBeUpdated) {
    res.status(404).json({ error: 'Availability not found' })
    return
  }

  const allFields = getAllFieldsFromSchema(Availability.schema)
  for (const field of allFields) {
    if (field === 'date') continue  // Note: For now disabling update of availability's date.
    if (field === 'boatId') continue // Note: An availabiliy's boatId cannot be changed.
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) continue
    if (field === 'date') {
      if (!isValidDateString(body[field])) {
        return res.status(400).json({ error: 'Invalid date format' })
      }
    }
    if (field === 'isAvailable') {
      if (typeof body[field] !== 'boolean') {
        return res.status(400).json({ error: 'isAvailable must be a boolean' })
      }
    }
    availabilityToBeUpdated[field] = body[field]
  }

  const updatedAvailability = await availabilityToBeUpdated.save()
  if (!updatedAvailability) {
    logger.error(`Failed to update availability. id: ${id}, body: ${JSON.stringify(body)}`)
    return res.status(500).json({ error: 'Failed to update availability' })
  }
  else {
    return res.json(updatedAvailability)
  }
})

availabilitiesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const availabilityToBeDeleted = await Availability.findOne({ _id: id, isDeleted: false })
  if (!availabilityToBeDeleted) {
    return res.status(404).json({ error: 'Availability not found' })
  }
  else {
    availabilityToBeDeleted.isDeleted = true
    availabilityToBeDeleted.deletedAt = new Date()
    const deletedAvailability = await availabilityToBeDeleted.save()
    if (!deletedAvailability) {
      logger.error(`Failed to delete availability. id: ${id}`)
      return res.status(500).json({ error: 'Internal server error' })
    }
    else {
      // Housekeeping!
      // 1. Update boat's availabilityIds
      const boatId = deletedAvailability.boatId
      const boatInDb = await Boat.findOne({ _id: boatId, isDeleted: false })
      if (!boatInDb) {
        logger.error(`Failed to update boat's availabilityIds after deleting availability. Boat not found: ${boatId}`)
      }
      else {
        boatInDb.availabilityIds = boatInDb.availabilityIds.filter(id => id.toString() !== deletedAvailability._id.toString())
        await boatInDb.save()
      }

      return res.status(204).end()
    }
  }
})

availabilitiesRouter.delete('/boat/:id', async (req, res) => {
  const id = req.params.id
  const deletedAvailabilities = await Availability.updateMany({ boatId: id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } })
  if (!deletedAvailabilities) {
    logger.error(`Failed to delete availabilities for boat: ${id}`)
    res.status(404).json({ error: 'availabilities not found' })
  }
  else {
    // Housekeeping!
    // 1. Update boat's availabilityIds
    const updatedBoat = await Boat.updateOne({ _id: id, isDeleted: false }, { $set: { availabilityIds: [] } })
    if (!updatedBoat) {
      logger.error(`Failed to update boat's availabilityIds after deleting availabilities. Boat not found: ${id}`)
    }

    res.status(204).end()
  }
})

module.exports = availabilitiesRouter