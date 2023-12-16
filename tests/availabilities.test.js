const mongoose = require('mongoose')
const Agency = require("../models/agency")
const Boat = require("../models/boat")
const Availability = require("../models/availability")
const { initialDocs, validDocs, docsInDb, requiredFeilds } = require("./helper")
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

beforeEach(async () => {
  await Agency.deleteMany({})
  await Boat.deleteMany({})
  await Availability.deleteMany({})
  const agency = initialDocs.agencies[0]
  const agencyObject = new Agency(agency)
  await agencyObject.save()
  const boat = { ...initialDocs.boats[0], agency: agencyObject._id.toString() }
  const boatObject = new Boat(boat)
  await boatObject.save()
  for (let availability of initialDocs.availabilities) {
    availability.boat = boatObject._id.toString()
    let availabilityObject = new Availability(availability)
    await availabilityObject.save()
  }
})

test("all availabilities are returned and have boat", async () => {
  const response = await api.get("/api/availabilities")
  expect(response.body).toHaveLength(initialDocs.availabilities.length)
  expect(response.body[0]).toHaveProperty("boat")
  expect(response.body[0].boat).toHaveProperty("numberOfBedrooms")
})

test("a specific availability is within the returned availabilities and has boat", async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToView = availabilitiesAtStart[0]
  const resultAvailability = await api
    .get(`/api/availabilities/${availabilityToView.id}`)
    .expect(200)
    .expect("Content-Type", /application\/json/)
  expect(resultAvailability.body.id).toEqual(availabilityToView.id)
  expect(resultAvailability.body.boat).toHaveProperty("numberOfBedrooms")
})

test('availabilities can be fetched using boat id', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boat = boatsInDb[0]
  const response = await api
    .get(`/api/availabilities/boat/${boat.id}`)
    .expect(200)
    .expect('Content-Type', /application\/json/)
  expect(response.body[0]).toHaveProperty("boat", boat.id)
})

test('availabilities are returned as json', async () => {
  await api
    .get('/api/availabilities')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('a valid availability can be added', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boat = boatsInDb[0]
  const availability = { ...validDocs.availability, boat: boat.id }
  await api
    .post('/api/availabilities')
    .send(availability)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const availabilitiesAtEnd = await docsInDb(Availability)
  expect(availabilitiesAtEnd).toHaveLength(initialDocs.availabilities.length + 1)
})

describe('testing out availability creation using invalid data', () => {
  test.each(requiredFeilds.availability)('fails with correct message when missing %s', async (field) => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, boat: boat.id }
    delete availability[field]
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })

  // Test Invalid date format
  test('fails with correct message when date format is invalid', async () => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, date: 'invalid', boat: boat.id }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid date format')
  })

  // isAvailable must be a boolean
  test('fails with correct message when isAvailable is not a boolean', async () => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, isAvailable: 'invalid', boat: boat.id }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('isAvailable must be a boolean')
  })

  // Invalid boat id in 'boat' field
  test('fails with correct message when boat id is not valid', async () => {
    const availability = { ...validDocs.availability, boat: 'invalid' }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid boat id')
  })
})

test('an availability can be updated', async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToUpdate = availabilitiesAtStart[0]
  const updatedAvailability = { ...availabilityToUpdate, baseRate: 25000 }
  const response = await api
    .put(`/api/availabilities/${availabilityToUpdate.id}`)
    .send(updatedAvailability)
    .expect(200)
  expect(response.body.baseRate).toBe(25000)
})

test('an availability can be deleted', async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToDelete = availabilitiesAtStart[0]
  await api
    .delete(`/api/availabilities/${availabilityToDelete.id}`)
    .expect(204)
  const availabilitiesAtEnd = await docsInDb(Availability)
  expect(availabilitiesAtEnd).toHaveLength(initialDocs.availabilities.length - 1)
  const availabilityIds = availabilitiesAtEnd.map(a => a.id)
  expect(availabilityIds).not.toContain(availabilityToDelete.id)
})

test('availabilities can be deleted using boat id', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boatToDeleteAvailabilitiesFor = boatsInDb[0]
  await api
    .delete(`/api/availabilities/boat/${boatToDeleteAvailabilitiesFor.id}`)
    .expect(204)
  const boatAvailabilities = await Availability.find({ boat: boatToDeleteAvailabilitiesFor.id })
  expect(boatAvailabilities).toHaveLength(0)
})

afterAll(() => {
  mongoose.connection.close()
})