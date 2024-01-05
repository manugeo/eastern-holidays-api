const mongoose = require('mongoose')
const Agency = require("../models/agency")
const Boat = require("../models/boat")
const Availability = require("../models/availability")
const { initialAgenciesWithBoats, validDocs, docsInDb,  } = require("./helper")
const supertest = require('supertest')
const app = require('../app')
const logger = require('../utils/logger')
const { getRequiredFieldsFromSchema } = require('../utils/utils')
const api = supertest(app)

beforeEach(async () => {
  await Agency.deleteMany({})
  await Boat.deleteMany({})
  await Availability.deleteMany({})

  for (let agency of initialAgenciesWithBoats) {
    const savedAgency = await Agency.create(agency)
    if (!savedAgency) {
      logger.error('Failed to create agency!')
    }
    else {
      for (let boat of agency.boats) {
        boat.agencyId = savedAgency._id
        const savedBoat = await Boat.create(boat)
        if (!savedBoat) {
          logger.error('Failed to create boat after agency creation!')
        }
        // 1. Update savedAgency.boatIds
        savedAgency.boatIds = [...savedAgency.boatIds, savedBoat._id]
        const updatedAgency = await savedAgency.save()
        if (!updatedAgency) {
          logger.error('Failed to update agency after boat creation!')
        }
        // 2. Create boat availability for the next 30 days using the boat id and default rates.
        const availabilities = []
        for (let i = 0; i < 30; i++) {
          const date = new Date()
          date.setDate(date.getDate() + 1 + i)
          date.setHours(0, 0, 0, 0)
          availabilities.push({
            date,
            isAvailable: true,
            baseRate: savedBoat.defaultBaseRate,
            adultRate: savedBoat.defaultAdultRate,
            childRate: savedBoat.defaultChildRate,
            infantRate: savedBoat.defaultInfantRate || 0,
            boatId: savedBoat._id
          })
        }
        const savedAvailabilities = await Availability.insertMany(availabilities)
        if (!savedAvailabilities || (savedAvailabilities.length !== availabilities.length)) {
          logger.error('Failed to create boat availabilities after boat creation!')
        }
        // 3. Update the saved boat availabilityIds array with the newly created availabilities ids.
        const savedAvailabilitiesIds = savedAvailabilities.map(availability => availability._id)
        savedBoat.availabilityIds = savedAvailabilitiesIds
        const updatedBoat = await savedBoat.save()
        if (!updatedBoat) {
          logger.error('Failed to update boat with automatically created new availabilities!')
        }
      }
    }
  }
})

test("All availabilities are returned.", async () => {
  const response = await api.get("/api/availabilities")
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  const numberOfInitialAvailabilities = numberOfInitialBoats * 30
  expect(response.body).toHaveLength(numberOfInitialAvailabilities)
})

test("A specific availability can be fetched using its id and its boat is populated.", async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToView = availabilitiesAtStart[0]
  const resultAvailability = await api
    .get(`/api/availabilities/${availabilityToView.id}`)
    .expect(200)
    .expect("Content-Type", /application\/json/)
  expect(resultAvailability.body.id).toEqual(availabilityToView.id.toString())
  expect(resultAvailability.body.boat).toHaveProperty("numberOfBedrooms")
})

test('Availabilities can be fetched using boat id.', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boat = boatsInDb[0]
  const response = await api
    .get(`/api/availabilities/boat/${boat.id}`)
    .expect(200)
    .expect('Content-Type', /application\/json/)
  expect(response.body).toHaveLength(boat.availabilityIds.length)
  for (const availability of response.body) {
    expect(availability.boatId).toEqual(boat.id.toString())
  }
})

test('A valid availability can be added.', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boat = boatsInDb[0]
  const availability = { ...validDocs.availability, boatId: boat.id }
  const response = await api
    .post('/api/availabilities')
    .send(availability)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const availabilitiesAtEnd = await docsInDb(Availability)
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  const numberOfInitialAvailabilities = numberOfInitialBoats * 30
  expect(availabilitiesAtEnd).toHaveLength(numberOfInitialAvailabilities + 1)

  // Make sure boat.availabilityIds has the new availability's id.
  const updatedBoat = await Boat.findOne({ _id: boat.id, isDeleted: false })
  expect(updatedBoat.availabilityIds.map(objId => objId.toString())).toContain(response.body.id)
})

describe('Testing out availability creation using invalid data.', () => {
  const requiredFeilds = getRequiredFieldsFromSchema(Availability.schema)
  test.each(requiredFeilds)('Fails with correct message when missing %s.', async (field) => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, boatId: boat.id }
    delete availability[field]
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })

  test('Fails with correct message when date format is invalid.', async () => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, date: 'invalid', boatId: boat.id }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid date format')
  })

  test('Fails with correct message when isAvailable is not a boolean.', async () => {
    const boatsInDb = await docsInDb(Boat)
    const boat = boatsInDb[0]
    const availability = { ...validDocs.availability, isAvailable: 'invalid', boatId: boat.id }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('isAvailable must be a boolean')
  })

  test('Fails with correct message when boat id is not valid.', async () => {
    const availability = { ...validDocs.availability, boatId: 'invalid' }
    const response = await api.post('/api/availabilities').send(availability)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid boatId')
  })
})

test('An availability can be updated.', async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToUpdate = availabilitiesAtStart[0]
  await api
    .put(`/api/availabilities/${availabilityToUpdate.id.toString()}`)
    .send({ baseRate: 25000 })
    .expect(200)
  const updatedAvailability = await Availability.findOne({ _id: availabilityToUpdate.id, isDeleted: false })
  expect(updatedAvailability.baseRate).toBe(25000)
})

test('An availability can be deleted and upon successful deletion, the boat(availabilityIds) is also updated.', async () => {
  const availabilitiesAtStart = await docsInDb(Availability)
  const availabilityToDelete = availabilitiesAtStart[0]
  await api
    .delete(`/api/availabilities/${availabilityToDelete.id}`)
    .expect(204)
  const availabilitiesAtEnd = await docsInDb(Availability)
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  const numberOfInitialAvailabilities = numberOfInitialBoats * 30
  expect(availabilitiesAtEnd).toHaveLength(numberOfInitialAvailabilities - 1)
  const availabilityIds = availabilitiesAtEnd.map(a => a.id)
  expect(availabilityIds).not.toContain(availabilityToDelete.id)

  // Make sure boat.availabilityIds doesn't have the deleted availability's id.
  const updatedBoat = await Boat.findOne({ _id: availabilityToDelete.boatId, isDeleted: false })
  expect(updatedBoat.availabilityIds).not.toContain(availabilityToDelete.id)
})

test('All availabilities for a boat can be deleted using the boat id upon successful deletion, boat(availabilityIds) is updated.', async () => {
  const boatsInDb = await docsInDb(Boat)
  const boatToDeleteAvailabilitiesFor = boatsInDb[0]
  await api
    .delete(`/api/availabilities/boat/${boatToDeleteAvailabilitiesFor.id}`)
    .expect(204)
  const boatAvailabilities = await Availability.find({ boatId: boatToDeleteAvailabilitiesFor.id, isDeleted: false })
  expect(boatAvailabilities).toHaveLength(0)

  // Make sure boat.availabilityIds is an empty array.
  const updatedBoat = await Boat.findOne({ _id: boatToDeleteAvailabilitiesFor.id, isDeleted: false })
  expect(updatedBoat.availabilityIds).toHaveLength(0)
})

afterAll(() => {
  mongoose.connection.close()
})