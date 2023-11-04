require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const app = express()
const Rate = require('./models/rate')

app.use(express.json())
morgan.token('body', function (req, res) { return JSON.stringify(req.body) })
app.use(morgan(':method :url :status :response-time ms - :res[content-length] - :body'))
// Todo: Restrict origins by setting cors options.
app.use(cors())

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1>')
})

app.get('/api/rates', (req, res) => {
  Rate.find({}).then(rates => {
    res.json(rates)
  })
})

app.get('/api/rates/:id', (req, res, next) => {
  const id = req.params.id
  Rate.findById(id).then(rate => {
    if (rate) {
      res.json(rate)
    } else {
      res.status(404).json({ error: 'Rate not found' })
    }
  }).catch(error => next(error))
})

app.post('/api/rates', (req, res) => {
  const body = req.body
  if (!body.date || !body.baseRate || !body.adultRate || !body.childRate) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.date)) {
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
    })
  }
})

app.put('/api/rates/:id', (req, res, next) => {
  const id = req.params.id
  const rate = {
    date: req.body.date,
    baseRate: req.body.baseRate,
    adultRate: req.body.adultRate,
    childRate: req.body.childRate
  }

  Rate.findByIdAndUpdate(id, rate, { new: true }).then(updatedRate => {
    res.json(updatedRate)
  }).catch(error => next(error))
})

app.delete('/api/rates/:id', (req, res, next) => {
  const id = req.params.id

  console.log("About to delete...", id, Rate, Rate.findByIdAndUpdate, Rate.findByIdAndRemove);

  // Note: For some reason 'Rate.findByIdAndRemove' does not work. But 'Rate.findByIdAndDelete' does.
  // See: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete()
  // No 'findByIdAndRemove' method is present here.

  Rate.findByIdAndDelete(id).then(result => {
    res.status(204).end()
  }).catch(error => next(error))
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } 
  next(error)
}
// this has to be the last loaded middleware.
app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Export the Express API
module.exports = app;