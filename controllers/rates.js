const ratesRouter = require('express').Router()
const Rate = require('../models/rate')
const { isoDateRegex } = require('../utils/utils')

ratesRouter.get('/', (req, res) => {
  Rate.find({}).then(rates => {
    res.json(rates)
  })
})

ratesRouter.get('/:id', (req, res, next) => {
  const id = req.params.id
  Rate.findById(id).then(rate => {
    if (rate) {
      res.json(rate)
    } else {
      res.status(404).json({ error: 'Rate not found' })
    }
  }).catch(error => next(error))
})

ratesRouter.post('/', (req, res, next) => {
  const body = req.body
  if (!body.date || !body.baseRate || !body.adultRate || !body.childRate) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (isoDateRegex.test(body.date)) {
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
    rate.save().then(savedRate => {
      res.json(savedRate)
    }).catch(error => next(error))
  }
})

ratesRouter.put('/:id', (req, res, next) => {
  const id = req.params.id
  const rate = {
    date: req.body.date,
    baseRate: req.body.baseRate,
    adultRate: req.body.adultRate,
    childRate: req.body.childRate
  }

  Rate.findByIdAndUpdate(id, rate, { new: true, runValidators: true, context: 'query' }).then(updatedRate => {
    res.json(updatedRate)
  }).catch(error => next(error))
})

ratesRouter.delete('/:id', (req, res, next) => {
  const id = req.params.id

  // Note: For some reason 'Rate.findByIdAndRemove' does not work. But 'Rate.findByIdAndDelete' does.
  // See: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
  // No 'findByIdAndRemove' method is present here.

  Rate.findByIdAndDelete(id).then(() => {
    res.status(204).end()
  }).catch(error => next(error))
})

module.exports = ratesRouter