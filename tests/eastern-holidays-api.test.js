const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Rate = require('../models/rate')

const initialRates = [
  {
    date: '2023-09-02T18:30:00.000Z',
    baseRate: 9000,
    adultRate: 500,
    childRate: 300,
    infantRate: 0
  },
  {
    date: '2022-05-02T18:30:00.000Z',
    baseRate: 12000,
    adultRate: 700,
    childRate: 450,
    infantRate: 0
  }
]

beforeEach(async () => {
  await Rate.deleteMany({})
  let rateObject = new Rate(initialRates[0])
  await rateObject.save()
  rateObject = new Rate(initialRates[1])
  await rateObject.save()
})

test('all rates are returned', async () => {
  const response = await api.get('/api/rates')
  expect(response.body).toHaveLength(initialRates.length)
})

test('a specific rate is within the returned rates', async () => {
  const response = await api.get('/api/rates')
  const rateDates = response.body.map(rate => rate.date)
  expect(rateDates).toContain('2023-09-02T18:30:00.000Z')
})

test('rates are returned as json', async () => {
  await api
    .get('/api/rates')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

afterAll(async () => {
  await mongoose.connection.close()
})