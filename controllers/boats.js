const boatsRouter = require('express').Router()
const Boat = require('../models/boat')
const Agency = require('../models/agency')
const Availability = require('../models/availability')
const logger = require('../utils/logger')
const { getAllFieldsFromSchema, getRequiredFieldsFromSchema } = require('../utils/utils')

boatsRouter.get('/', async (req, res) => {
  const boats = await Boat.find({ isDeleted: false }).populate('agency')
  res.json(boats)
})

boatsRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const boat = await Boat.findOne({ _id: id, isDeleted: false }).populate('agency').populate('availabilities')
  if (boat) {
    res.json(boat)
  } else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

boatsRouter.post('/', async (req, res) => {
  const body = req.body
  const {
    numberOfBedrooms, boatType, minAdultsRequired,
    defaultBaseRate, defaultAdultRate, defaultChildRate, defaultInfantRate,
    agencyId
  } = body
  const requiredFields = getRequiredFieldsFromSchema(Boat.schema)
  for (const field of requiredFields) {
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  if (numberOfBedrooms < 0 || numberOfBedrooms > 10) {
    res.status(400).json({ error: 'Number of bedrooms must be between 0 and 10' })
  }
  else if (!['deluxe', 'premium', 'luxury'].includes(boatType)) {
    res.status(400).json({ error: 'Boat type must be one of the following: deluxe, premium, luxury' })
  }
  else if (minAdultsRequired <= 0) {
    res.status(400).json({ error: 'Minimum number of adults required must be greater than 0' })
  }
  else {
    const agencyInDb = await Agency.findById(agencyId)
    if (!agencyInDb) {
      res.status(404).json({ error: 'Agency not found' })
    }
    else {
      const boat = new Boat({
        numberOfBedrooms,
        boatType,
        minAdultsRequired,
        defaultBaseRate,
        defaultAdultRate,
        defaultChildRate,
        defaultInfantRate: defaultInfantRate || 0,
        agencyId,
        availabilityIds: []
      })
      const savedBoat = await boat.save()
      if (!savedBoat) {
        res.status(500).json({ error: 'Internal server error' })
      }
      else {
        // Housekeeping!
        // 1. 'agencyInDb' needs to be updated as well.
        agencyInDb.boatIds = [...agencyInDb.boatIds, savedBoat._id]
        const savedAgency = await agencyInDb.save()
        if (!savedAgency) {
          logger.error('Failed to update agency while creating boat!')
        }

        // 2. Create boat availability for the next 30 days using the boat id and default rates.
        const availabilities = []
        for (let i = 0; i < 30; i++) {
          const date = new Date()
          date.setDate(date.getDate() + 1 + i)
          date.setHours(0, 0, 0, 0)
          availabilities.push({
            date,
            isAvailable: true,
            baseRate: defaultBaseRate,
            adultRate: defaultAdultRate,
            childRate: defaultChildRate,
            infantRate: defaultInfantRate || 0,
            boatId: savedBoat._id.toString()
          })
        }
        const savedAvailabilities = await Availability.insertMany(availabilities)
        if (!savedAvailabilities || (savedAvailabilities.length !== availabilities.length)) {
          logger.error('Failed to create boat availabilities after boat creation!')
        }

        // 3. Update the saved boat availabilityIds array with the newly created availabilities ids.
        const savedAvailabilitiesIds = savedAvailabilities.map(availability => availability._id)
        savedBoat.availabilityIds = savedAvailabilitiesIds
        const updatedBoat = await savedBoat.save()
        if (!updatedBoat) {
          logger.error('Failed to update boat with automatically created new availabilities!')
        }

        updatedBoat.agency = savedAgency
        updatedBoat.availabilities = savedAvailabilities
        res.status(201).json(savedBoat)
      }
    }
  }
})

boatsRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body
  const boatToBeUpdated = await Boat.findOne({ _id: id, isDeleted: false }).populate('agency').populate('availabilities')
  if (!boatToBeUpdated) {
    return res.status(404).json({ error: 'Boat not found' })
  }

  const allFields = getAllFieldsFromSchema(Boat.schema)
  for (const field of allFields) {
    if (field === 'agencyId') continue // Since 'agencyId' prop cannot be updated after creation.
    if (field === 'availabilityIds') continue // Since 'availabilityIds' is not updated from here. It gets updated from the 'availability' router.
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) continue

    if (field === 'numberOfBedrooms') {
      if (body[field] < 0 || body[field] > 10) {
        return res.status(400).json({ error: 'Number of bedrooms must be between 0 and 10' })
      }
    }
    if (field === 'boatType') {
      if (!['deluxe', 'premium', 'luxury'].includes(body[field])) {
        return res.status(400).json({ error: 'Boat type must be one of the following: deluxe, premium, luxury' })
      }
    }
    if (field === 'minAdultsRequired') {
      if (body[field] <= 0) {
        return res.status(400).json({ error: 'Minimum number of adults required must be greater than 0' })
      }
    }
    boatToBeUpdated[field] = body[field]
  }
  const updatedBoat = await boatToBeUpdated.save()
  if (!updatedBoat) {
    logger.error(`Failed to update boat. id: ${id}, body: ${JSON.stringify(body)}`)
    return res.status(500).json({ error: 'Internal server error' })
  }
  else {
    return res.status(200).json(updatedBoat)
  }
})

boatsRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const boatToBeDeleted = await Boat.findOne({ _id: id, isDeleted: false })
  if (!boatToBeDeleted) {
    return res.status(404).json({ error: 'Boat not found' })
  }
  boatToBeDeleted.isDeleted = true
  boatToBeDeleted.deletedAt = new Date()
  const deletedBoat = await boatToBeDeleted.save()
  if (!deletedBoat) {
    logger.error(`Failed to delete boat. id: ${id}`)
    return res.status(500).json({ error: 'Internal server error' })
  }
  else {
    // Housekeeping!
    // 1. Update agency's boatIds
    const agencyInDb = await Agency.findOne({ _id: deletedBoat.agencyId, isDeleted: false })
    if (!agencyInDb) {
      logger.error(`Failed to find agency with id: ${deletedBoat.agencyId} to update it's boatIds after deleting boat!`)
    }
    else {
      agencyInDb.boatIds = agencyInDb.boatIds.filter(boatId => boatId.toString() !== id)
      const updatedAgency = await agencyInDb.save()
      if (!updatedAgency) {
        logger.error(`Failed to update agency with id: ${deletedBoat.agencyId} after deleting boat!`)
      }
    }
    // 2. Delete availabilities for the deleted boat as well.
    const deletedAvailabilities = await Availability.updateMany({ boatId: id, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } })
    if (!deletedAvailabilities || !deletedAvailabilities.modifiedCount) {
      logger.error(`Failed to delete availabilities for boat: ${id}`)
    }

    res.status(204).end()
  }
})

module.exports = boatsRouter