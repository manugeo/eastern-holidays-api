const boatsRouter = require('express').Router()
const Boat = require('../models/boat')
const Agency = require('../models/agency')
const { requiredFeilds } = require('../tests/helper')
const Availability = require('../models/availability')
const logger = require('../utils/logger')

boatsRouter.get('/', async (req, res) => {
  const boats = await Boat.find({}).populate('agency')
  res.json(boats)
})

boatsRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const boat = await Boat.findById(id).populate('agency').populate('availabilities')
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
  for (const field of requiredFeilds.boat) {
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
  const {
    numberOfBedrooms, boatType, minAdultsRequired,
    defaultBaseRate, defaultAdultRate, defaultChildRate, defaultInfantRate
  } = body
  // Todo: Update only the fields supplied. Take rest from the original doc.
  for (const field of requiredFeilds.boat) {
    if (field === 'agencyId') continue //Since 'agencyId' prop cannot be updated after creation.
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
    const boat = {
      numberOfBedrooms,
      boatType,
      minAdultsRequired,
      defaultBaseRate,
      defaultAdultRate,
      defaultChildRate,
      defaultInfantRate: defaultInfantRate || 0,
      // Note: 'agencyId' prop cannot be updated after creation.
      // Note: Boats availability is not updated from here. It gets updated from the 'availability' router.
    }
    const updatedBoat = await Boat.findByIdAndUpdate(id, boat, { new: true, runValidators: true, context: 'query' })
    if (!updatedBoat) {
      res.status(404).json({ error: 'Boat not found' })
    }
    else {
      // Todo: Return boat with 'agency' and 'availabilities' populated (manually).
      res.json(updatedBoat)
    }
  }
})

boatsRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const deletedBoat = await Boat.findByIdAndDelete(id)
  if (deletedBoat) {
    // Housekeeping!

    // 1. Update agency's boatIds
    const agencyInDb = await Agency.findById(deletedBoat.agencyId)
    if (!agencyInDb) {
      logger.error('Failed to update agency boatIds after deleting boat!')
    }
    else {
      agencyInDb.boatIds = agencyInDb.boatIds.filter(boatId => boatId.toString() !== id)
      const updatedAgency = await agencyInDb.save()
      if (!updatedAgency) {
        logger.error('Failed to update agency boatIds after deleting boat!')
      }
    }
    // 2. Delete availabilities for the deleted boat as well.
    const deletedAvailabilities = await Availability.deleteMany({ boatId: id })
    if (!deletedAvailabilities) {
      logger.error('Failed to delete boat availabilities after deleting boat!')
    }

    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

module.exports = boatsRouter