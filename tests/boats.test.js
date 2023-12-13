const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Boat = require('../models/boat')
const { initialDocs, validDocs, docsInDb } = require('./helper')

beforeEach(async () => {
  await Boat.deleteMany({})
  for (let boat of initialDocs.boats) {
    let boatObject = new Boat(boat)
    await boatObject.save()
  }
})

test('all boats are returned', async () => {
  const response = await api.get('/api/boats')
  expect(response.body).toHaveLength(initialDocs.boats.length)
})

test('a specific boat is within the returned boats', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToView = boatsAtStart[0]
  const resultBoat = await api.get(`/api/boats/${boatToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultBoat.body).toEqual(boatToView)
})

test('boats are returned as json', async () => {
  await api
    .get('/api/boats')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('a valid boat can be added', async () => {
  await api
    .post('/api/boats')
    .send(validDocs.boat)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const boatsAtEnd = await docsInDb(Boat)
  expect(boatsAtEnd).toHaveLength(initialDocs.boats.length + 1)
})

describe('testing out boat creation using invalid data', () => {
  test.each([
    'numberOfBedrooms', 'boatType', 'minAdultsRequired', 'defaultBaseRate', 'defaultAdultRate', 'defaultChildRate'
  ])('fails with correct message when missing %s', async (field) => {
    const boat = { ...validDocs.boat }
    delete boat[field]
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Missing required field')
  })
  test('fails with correct message when number of bedrooms is not between 0 and 10', async () => {
    const boat = { ...validDocs.boat }
    boat.numberOfBedrooms = 100
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Number of bedrooms must be between 0 and 10')
  })
  test('fails with correct message when boat type is not one of the following: deluxe, premium, luxury', async () => {
    const boat = { ...validDocs.boat }
    boat.boatType = 'invalid'
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Boat type must be one of the following: deluxe, premium, luxury')
  })
  test('fails with correct message when minimum number of adults required is less than 1', async () => {
    const boat = { ...validDocs.boat }
    boat.minAdultsRequired = 0
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Minimum number of adults required must be greater than 0')
  })
})

// A boat can be updated
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

// A boat can be deleted
test('a boat can be deleted', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToDelete = boatsAtStart[0]
  await api
    .delete(`/api/boats/${boatToDelete.id}`)
    .expect(204)
  const boatsAtEnd = await docsInDb(Boat)
  expect(boatsAtEnd).toHaveLength(initialDocs.boats.length - 1)
  const boatIds = boatsAtEnd.map(b => b.id)
  expect(boatIds).not.toContain(boatToDelete.id)
})

afterAll(() => {
  mongoose.connection.close()
})