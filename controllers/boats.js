const boatRouter = require('express').Router()
const Boat = require('../models/boat')

boatRouter.get('/', async (req, res) => {
  const boats = await Boat.find({})
  res.json(boats)
})

boatRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const boat = await Boat.findById(id)
  if (boat) {
    res.json(boat)
  } else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

boatRouter.post('/', async (req, res) => {
  const body = req.body
  const {
    numberOfBedrooms, boatType, minAdultsRequired,
    defaultBaseRate, defaultAdultRate, defaultChildRate, defaultInfantRate,
    availabilities
  } = body
  // eslint-disable-next-line eqeqeq
  if ((numberOfBedrooms == null) || (boatType == null) || (minAdultsRequired == null) || (defaultBaseRate == null) || (defaultAdultRate == null) || (defaultChildRate == null)) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (numberOfBedrooms < 0 || numberOfBedrooms > 10) {
    res.status(400).json({ error: 'Number of bedrooms must be between 0 and 10' })
  }
  else if (!['deluxe', 'premium', 'luxury'].includes(boatType)) {
    res.status(400).json({ error: 'Boat type must be one of the following: deluxe, premium, luxury' })
  }
  else if (minAdultsRequired <= 0) {
    res.status(400).json({ error: 'Minimum number of adults required must be greater than 0' })
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
      availabilities: availabilities || []
    })
    const savedBoat = await boat.save()
    res.status(201).json(savedBoat)
  }
})

boatRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body
  const {
    numberOfBedrooms, boatType, minAdultsRequired,
    defaultBaseRate, defaultAdultRate, defaultChildRate, defaultInfantRate,
    availabilities
  } = body
  // eslint-disable-next-line eqeqeq
  if ((numberOfBedrooms == null) || (boatType == null) || (minAdultsRequired == null) || (defaultBaseRate == null) || (defaultAdultRate == null) || (defaultChildRate == null)) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (numberOfBedrooms < 0 || numberOfBedrooms > 10) {
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
      availabilities: availabilities || []
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

boatRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const deletedBoat = await Boat.findByIdAndDelete(id)
  if (deletedBoat) {
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Boat not found' })
  }
})

module.exports = boatRouter