const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Boat = require('../models/boat')
const { initialDocs, validDocs, docsInDb, requiredFeilds } = require('./helper')
const Agency = require('../models/agency')
const Availability = require('../models/availability')

beforeEach(async () => {
  await Agency.deleteMany({})
  await Boat.deleteMany({})
  const agency = initialDocs.agencies[0]
  const agencyObject = new Agency(agency)
  await agencyObject.save()
  for (let boat of initialDocs.boats) {
    boat.agency = agencyObject._id.toString()
    let boatObject = new Boat(boat)
    await boatObject.save()
  }
})

test('all boats are returned and have agency', async () => {
  const response = await api.get('/api/boats')
  expect(response.body).toHaveLength(initialDocs.boats.length)
  expect(response.body[0]).toHaveProperty('agency')
  expect(response.body[0].agency).toHaveProperty('name')
})

test('a specific boat is within the returned boats and has agency', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToView = boatsAtStart[0]
  const resultBoat = await api.get(`/api/boats/${boatToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultBoat.body.id).toEqual(boatToView.id)
  expect(resultBoat.body.agency).toHaveProperty('name')
})

test('boats are returned as json', async () => {
  await api
    .get('/api/boats')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('a valid boat can be added and availabilities for the next 30 days are automatically added', async () => {
  const agenciesInDb = await docsInDb(Agency)
  const agency = agenciesInDb[0]
  const boat = { ...validDocs.boat, agency: agency.id }
  const response = await api
    .post('/api/boats')
    .send(boat)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const boatsAtEnd = await docsInDb(Boat)
  expect(boatsAtEnd).toHaveLength(initialDocs.boats.length + 1)
  expect(response.body.availabilities).toHaveLength(30)
})

describe('testing out boat creation using invalid data', () => {
  test.each(requiredFeilds.boat)('fails with correct message when missing %s', async (field) => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agency: agency.id }
    delete boat[field]
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })
  test('fails with correct message when number of bedrooms is not between 0 and 10', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agency: agency.id }
    boat.numberOfBedrooms = 100
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Number of bedrooms must be between 0 and 10')
  })
  test('fails with correct message when boat type is not one of the following: deluxe, premium, luxury', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agency: agency.id }
    boat.boatType = 'invalid'
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Boat type must be one of the following: deluxe, premium, luxury')
  })
  test('fails with correct message when minimum number of adults required is less than 1', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agency: agency.id }
    boat.minAdultsRequired = 0
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Minimum number of adults required must be greater than 0')
  })
})

test('a boat can be updated', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToUpdate = boatsAtStart[0]
  const updatedBoat = { ...boatToUpdate, numberOfBedrooms: 5 }
  const response = await api
    .put(`/api/boats/${boatToUpdate.id}`)
    .send(updatedBoat)
    .expect(200)
  expect(response.body.numberOfBedrooms).toBe(5)
})

test('a boat can be deleted and its availabilities will also get deleted', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToDelete = boatsAtStart[0]
  await api
    .delete(`/api/boats/${boatToDelete.id}`)
    .expect(204)
  const boatsAtEnd = await docsInDb(Boat)
  expect(boatsAtEnd).toHaveLength(initialDocs.boats.length - 1)
  const boatIds = boatsAtEnd.map(b => b.id)
  expect(boatIds).not.toContain(boatToDelete.id)
  // When boat is deleted, availabilities for the boat should also be deleted
  const deletedBoatAvailabilities = await Availability.find({ boat: boatToDelete.id })
  expect(deletedBoatAvailabilities).toHaveLength(0)
})

afterAll(() => {
  mongoose.connection.close()
})