const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Boat = require('../models/boat')
const helper = require('./helpers/boats-helper')

beforeEach(async () => {
  await Boat.deleteMany({})
  for (let boat of helper.initialBoats) {
    let boatObject = new Boat(boat)
    await boatObject.save()
  }
})

test('all boats are returned', async () => {
  const response = await api.get('/api/boats')
  expect(response.body).toHaveLength(helper.initialBoats.length)
})

// Todo: Add rest of tests

afterAll(() => {
  mongoose.connection.close()
})