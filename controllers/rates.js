const ratesRouter = require('express').Router()
const Rate = require('../models/rate')
const { isValidDateString } = require('../utils/utils')

ratesRouter.get('/', async (req, res) => {
  const rates = await Rate.find({})
  res.json(rates)
})

ratesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const rate = await Rate.findById(id)
  if (rate) {
    res.json(rate)
  } else {
    res.status(404).json({ error: 'Rate not found' })
  }
})

ratesRouter.post('/', async (req, res) => {
  const body = req.body
  // eslint-disable-next-line eqeqeq
  if (!body.date || (body.baseRate == null) || (body.adultRate == null) || (body.childRate == null)) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (!isValidDateString(body.date)) {
    res.status(400).json({ error: 'Invalid date format' })
  }
  else {
    const rate = new Rate({
      date: new Date(body.date).setHours(0, 0, 0, 0),
      baseRate: body.baseRate,
      adultRate: body.adultRate,
      childRate: body.childRate,
      infantRate: body.infantRate || 0
    })
    const savedRate = await rate.save()
    res.status(201).json(savedRate)
  }
})

ratesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const rate = {
    date: req.body.date,
    baseRate: req.body.baseRate,
    adultRate: req.body.adultRate,
    childRate: req.body.childRate,
    infantRate: req.body.infantRate
  }
  const updatedRate = await Rate.findByIdAndUpdate(id, rate, { new: true, runValidators: true, context: 'query' })
  res.json(updatedRate)
})

ratesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id

  // Note: For some reason 'Rate.findByIdAndRemove' does not work. But 'Rate.findByIdAndDelete' does.
  // See: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
  // No 'findByIdAndRemove' method is present here.

  await Rate.findByIdAndDelete(id)
  res.status(204).end()
})

module.exports = ratesRouter