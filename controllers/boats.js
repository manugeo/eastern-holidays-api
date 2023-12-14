const boatsRouter = require('express').Router()
const Boat = require('../models/boat')
const Agency = require('../models/agency')
const { requiredFeilds } = require('../tests/helper')

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
    // Note: 'agencyInDb' needs to be updated as well.
    agencyInDb.boats = [...agencyInDb.boats, savedBoat._id]
    await agencyInDb.save()
    res.status(201).json(savedBoat)
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
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

module.exports = boatsRouter