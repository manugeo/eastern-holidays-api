const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Rate = require('../models/rate')
const helper = require('./helper')

beforeEach(async () => {
  await Rate.deleteMany({})
  for (let rate of helper.initialDocs.rates) {
    let rateObject = new Rate(rate)
    await rateObject.save()
  }
})

test('all rates are returned', async () => {
  const response = await api.get('/api/rates')
  expect(response.body).toHaveLength(helper.initialDocs.rates.length)
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

test('a valid rate can be added', async () => {

  await api
    .post('/api/rates')
    .send(helper.validDocs.rate)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const ratesAtEnd = await helper.docsInDb(Rate)
  expect(ratesAtEnd).toHaveLength(helper.initialDocs.rates.length + 1)
  const dates = ratesAtEnd.map(r => r.date)
  expect(dates).toContain(helper.validDocs.rate.date)
})

test('rate without date is not added', async () => {
  const newRate = {
    baseRate: 9000,
    adultRate: 500,
    childRate: 300
  }
  await api.post('/api/rates').send(newRate).expect(400)
  const ratesAtEnd = await helper.docsInDb(Rate)
  expect(ratesAtEnd).toHaveLength(helper.initialDocs.rates.length)
})

test('a specific rate can be viewed', async () => {
  const ratesAtStart = await helper.docsInDb(Rate)
  const rateToView = ratesAtStart[0]

  const resultRate = await api.get(`/api/rates/${rateToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultRate.body).toEqual(rateToView)
})

test('a rate can be deleted', async () => {
  const ratesAtStart = await helper.docsInDb(Rate)
  const rateToDelete = ratesAtStart[0]

  await api
    .delete(`/api/rates/${rateToDelete.id}`)
    .expect(204)
  const ratesAtEnd = await helper.docsInDb(Rate)
  expect(ratesAtEnd).toHaveLength(helper.initialDocs.rates.length - 1)

  const dates = ratesAtEnd.map(r => r.date)
  expect(dates).not.toContain(rateToDelete.date)
})

afterAll(async () => {
  await mongoose.connection.close()
})