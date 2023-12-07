const availabilitiesRouter = require('express').Router()
const Availability = require('../models/availability')
const { isValidDateString } = require('../utils/utils')

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

availabilitiesRouter.post('/', async (req, res) => {
  const body = req.body
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate } = body
  // eslint-disable-next-line eqeqeq
  if (!date || (isAvailable == null) || (baseRate == null) || (adultRate == null) || (childRate == null)) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (!isValidDateString(date)) {
    res.status(400).json({ error: 'Invalid date format' })
  }
  else if (typeof isAvailable !== 'boolean') {
    res.status(400).json({ error: 'isAvailable must be a boolean' })
  }
  else {
    const availability = new Availability({
      date: new Date(date).setHours(0, 0, 0, 0),
      isAvailable,
      baseRate,
      adultRate,
      childRate,
      infantRate: infantRate || 0
    })
    const savedAvailability = await availability.save()
    res.status(201).json(savedAvailability)
  }
})

availabilitiesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const { date, isAvailable, baseRate, adultRate, childRate, infantRate } = req.body
  // eslint-disable-next-line eqeqeq
  if (!date || (isAvailable == null) || (baseRate == null) || (adultRate == null) || (childRate == null)) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (!isValidDateString(date)) {
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
      infantRate: infantRate || 0
    }
    const updatedAvailability = await Availability.findByIdAndUpdate(id, availability, { new: true, runValidators: true, context: 'query' })
    res.json(updatedAvailability)
  }
})

availabilitiesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  // Note: For some reason 'Rate.findByIdAndRemove' does not work. But 'Rate.findByIdAndDelete' does.
  // See: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
  // No 'findByIdAndRemove' method is present here.
  await Availability.findByIdAndDelete(id)
  res.status(204).end()
})

module.exports = availabilitiesRouter