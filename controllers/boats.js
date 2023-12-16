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
  const boat = await Boat.findById(id).populate('agency')
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
    agency
  } = body
  for (const field of requiredFeilds.boat) {
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      res.status(400).json({ error: `Missing required field: ${field}` })
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
    const agencyInDb = await Agency.findById(agency)
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
        agency,
        // Note: Boats availability is not added from here. It gets added from the 'availability' router.
        availabilities: []
      })
      const savedBoat = await boat.save()
      if (!savedBoat) {
        res.status(500).json({ error: 'Internal server error' })
      }
      else {
        // Housekeeping!
        // 1. 'agencyInDb' needs to be updated as well.
        agencyInDb.boats = [...agencyInDb.boats, savedBoat._id]
        const savedAgency = await agencyInDb.save()
        if (!savedAgency) {
          logger.error('Failed to update agency!')
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
            boat: savedBoat._id.toString()
          })
        }
        const savedAvailabilities = await Availability.insertMany(availabilities)
        if (!savedAvailabilities) {
          logger.error('Failed to create boat availabilities!')
        }

        savedBoat.agency = savedAgency
        savedBoat.availabilities = savedAvailabilities
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
  for (const field of requiredFeilds.boat) {
    if (field === 'agency') continue
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      res.status(400).json({ error: `Missing required field: ${field}` })
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
      // Note: 'agency' is prop cannot be updated after creation.
      // Note: Boats availability is not updated from here. It gets updated from the 'availability' router.
    }
    const updatedBoat = await Boat.findByIdAndUpdate(id, boat, { new: true, runValidators: true, context: 'query' })
    if (!updatedBoat) {
      res.status(404).json({ error: 'Boat not found' })
    }
    else {
      res.json(updatedBoat)
    }
  }
})

boatsRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const deletedBoat = await Boat.findByIdAndDelete(id)
  if (deletedBoat) {
    // Housekeeping!
    // 1. Delete availabilities for the deleted boat as well.
    const deletedAvailabilities = await Availability.deleteMany({ boat: id })
    if (!deletedAvailabilities) {
      logger.error('Failed to delete boat availabilities!')
    }
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

module.exports = boatsRouter