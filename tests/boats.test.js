const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Boat = require('../models/boat')
const { initialAgenciesWithBoats, validDocs, docsInDb } = require('./helper')
const Agency = require('../models/agency')
const Availability = require('../models/availability')
const logger = require('../utils/logger')
const { getRequiredFieldsFromSchema } = require('../utils/utils')

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

test('All boats are returned and each has agency field populated.', async () => {
  const response = await api.get('/api/boats')
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  expect(response.body).toHaveLength(numberOfInitialBoats)
  expect(response.body[0]).toHaveProperty('agency')
})

test('A specific boat can be fetched using its id and it has both agency and availability fields populated.', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToView = boatsAtStart[0]
  const resultBoat = await api.get(`/api/boats/${boatToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultBoat.body.id).toEqual(boatToView.id)
  expect(resultBoat.body.agency).toHaveProperty('name')
  expect(resultBoat.body.availabilities).toBeInstanceOf(Array)
  expect(resultBoat.body.availabilities).toHaveLength(boatToView.availabilityIds.length)
})

test('A valid boat can be added and all the housekeeping is done properly.', async () => {
  const agenciesInDb = await docsInDb(Agency)
  const agency = agenciesInDb[0]
  const boat = { ...validDocs.boat, agencyId: agency.id }
  const response = await api
    .post('/api/boats')
    .send(boat)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const boatsAtEnd = await docsInDb(Boat)
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  expect(boatsAtEnd).toHaveLength(numberOfInitialBoats + 1)

  // Make sure agency.boatIds has the new boat's id.
  const updatedAgency = await Agency.findOne({ _id: agency.id, isDeleted: false })
  expect(updatedAgency.boatIds.map(id => id.toString())).toContain(response.body.id)

  // Make sure 30 availabilities are created for boat for the next 30 days.
  const boatAvailabilities = await Availability.find({ boatId: response.body.id, isDeleted: false })
  expect(boatAvailabilities).toHaveLength(30)

  // Make sure boat.availabilityIds is same as the new 30 availability ids.
  const updatedBoat = await Boat.findOne({ _id: response.body.id, isDeleted: false })
  expect(updatedBoat.availabilityIds.map(id => id.toString())).toEqual(boatAvailabilities.map(availability => availability._id.toString()))
})

describe('Testing out boat creation using invalid data:', () => {
  const requiredFeilds = getRequiredFieldsFromSchema(Boat.schema)
  test.each(requiredFeilds)('Fails with correct message when missing %s', async (field) => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agencyId: agency.id }
    delete boat[field]
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })
  test('F`ails with correct message when number of bedrooms is not between 0 and 10.', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agencyId: agency.id }
    boat.numberOfBedrooms = 100
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Number of bedrooms must be between 0 and 10')
  })
  test('F`ails with correct message when boat type is not one of the following: deluxe, premium, luxury.', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agencyId: agency.id }
    boat.boatType = 'invalid'
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Boat type must be one of the following: deluxe, premium, luxury')
  })
  test('F`ails with correct message when minimum number of adults required is less than 1.', async () => {
    const agenciesInDb = await docsInDb(Agency)
    const agency = agenciesInDb[0]
    const boat = { ...validDocs.boat, agencyId: agency.id }
    boat.minAdultsRequired = 0
    const response = await api.post('/api/boats').send(boat)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Minimum number of adults required must be greater than 0')
  })
})

test('A boat can be successfully updated.', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToUpdate = boatsAtStart[0]
  const updatedBoat = { ...boatToUpdate, numberOfBedrooms: 5 }
  const response = await api
    .put(`/api/boats/${boatToUpdate.id}`)
    .send(updatedBoat)
    .expect(200)
  expect(response.body.numberOfBedrooms).toBe(5)
})

test('A boat can be deleted and upon successful deletion, its availabilities are also deleted and the agency.boatIds is updated.', async () => {
  const boatsAtStart = await docsInDb(Boat)
  const boatToDelete = boatsAtStart[0]
  await api
    .delete(`/api/boats/${boatToDelete.id}`)
    .expect(204)
  const boatsAtEnd = await docsInDb(Boat)
  const numberOfInitialBoats = initialAgenciesWithBoats.reduce((sum, agency) => sum + agency.boats.length, 0)
  expect(boatsAtEnd).toHaveLength(numberOfInitialBoats - 1)
  const boatIdsAtEnd = boatsAtEnd.map(b => b.id)
  expect(boatIdsAtEnd).not.toContain(boatToDelete.id)

  // Make sure agency.boatIds is updated.
  const updatedAgency = await Agency.findOne({ _id: boatToDelete.agencyId, isDeleted: false })
  expect(updatedAgency.boatIds).not.toContain(boatToDelete.id)

  // Make sure all of delted boat's availabilities are deleted.
  const deletedBoatAvailabilities = await Availability.find({ boat: boatToDelete.id, isDeleted: false })
  expect(deletedBoatAvailabilities).toHaveLength(0)
})

afterAll(() => {
  mongoose.connection.close()
})