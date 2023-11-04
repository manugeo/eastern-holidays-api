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

let rates =   [
  {
    "id": '1',
    "date": "2022-01-02T00:00:00.000Z",
    "baseRate": 9000,
    "adultRate": 500,
    "childRate": 300,
    "infantRate": 0
  },
  {
    "id": '2',
    "date": "2022-01-03T00:00:00.000Z",
    "baseRate": 12000,
    "adultRate": 700,
    "childRate": 450,
    "infantRate": 0
  },
]

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1>')
})

app.get('/api/rates', (req, res) => {
  Rate.find({}).then(rates => {
    res.json(rates)
  })
})

app.get('/api/rates/:id', (req, res) => {
  const id = req.params.id
  Rate.findById(id).then(rate => {
    if (rate) {
      res.json(rate)
    } else {
      res.status(404).json({ error: 'Rate not found' })
    }
  })
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

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Export the Express API
module.exports = app;