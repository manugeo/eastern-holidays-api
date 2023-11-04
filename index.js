const express = require('express')
const morgan = require('morgan')
const app = express()

app.use(express.json())
morgan.token('body', function (req, res) { return JSON.stringify(req.body) })
app.use(morgan(':method :url :status :response-time ms - :res[content-length] - :body'))

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
  res.json(rates)
})

app.get('/api/rates/:id', (req, res) => {
  const id = req.params.id
  const rate = rates.find(r => r.id === id)
  if (rate) {
    res.json(rate)
  } else {
    res.status(404).send('Rate not found')
  }
})

app.post('/api/rates', (req, res) => {
  const body = req.body
  if (!body.date || !body.baseRate || !body.adultRate) {
    res.status(400).json({ error: 'Missing required fields' })
  }
  const rate = {
    date: body.date,
    baseRate: body.baseRate,
    adultRate: body.adultRate,
    childRate: body.childRate,
    infantRate: body.infantRate || 0
  }
  const maxId = Math.max(...rates.map(r => parseInt(r.id))) || 0
  rate.id = (maxId + 1).toString()
  rates.push(rate)
  res.status(201).json(rate)
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})