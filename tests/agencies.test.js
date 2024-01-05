const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Agency = require("../models/agency")
const Boat = require('../models/boat')
const Availability = require('../models/availability')
const { initialAgenciesWithBoats, validDocs, docsInDb } = require("./helper")
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

test('All agencies are returned.', async () => {
  const response = await api.get('/api/agencies')
  expect(response.body).toHaveLength(initialAgenciesWithBoats.length)
})

test('A specific agency can be fetched using its id. And its boats are also returned', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToView = agenciesAtStart[0]
  const resultAgency = await api.get(`/api/agencies/${agencyToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultAgency.body.id).toEqual(agencyToView.id)
  // Make sure resultAgency.body.boats is an array and its not empty
  expect(resultAgency.body.boats).toBeInstanceOf(Array)
  expect(resultAgency.body.boats).toHaveLength(agencyToView.boatIds.length)
})

test('Agencies are returned as json', async () => {
  await api
    .get('/api/agencies')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('A valid agency can be added', async () => {
  await api
    .post('/api/agencies')
    .send(validDocs.agency)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialAgenciesWithBoats.length + 1)
  const names = agenciesAtEnd.map(a => a.name)
  expect(names).toContain(validDocs.agency.name)
})

describe('Testing out agency creation using invalid data', () => {
  const requiredFields = getRequiredFieldsFromSchema(Agency.schema)
  test.each(requiredFields)('fails with correct message when missing %s', async (field) => {
    const agency = { ...validDocs.agency }
    delete agency[field]
    const response = await api.post('/api/agencies').send(agency)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })
  test('Fails with correct message when phone number is not 10 digits', async () => {
    const agency = { ...validDocs.agency, phone: '+91-9946994959' }
    const response = await api.post('/api/agencies').send(agency)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid phone number. Should be a 10-digit number')
  })
})

test('An agency can be updated', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToUpdate = agenciesAtStart[0]
  const agency = { ...agencyToUpdate, name: 'Updated agency name' }
  await api
    .put(`/api/agencies/${agencyToUpdate.id}`)
    .send(agency)
    .expect(200)
    .expect('Content-Type', /application\/json/)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialAgenciesWithBoats.length)
  const updatedAgency = agenciesAtEnd.find(a => a.id === agencyToUpdate.id)
  expect(updatedAgency.name).toBe(agency.name)
})

test('An agency can be deleted and upon success, its boats and their availabilities are also deleted.', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToDelete = agenciesAtStart[0]
  await api
    .delete(`/api/agencies/${agencyToDelete.id}`)
    .expect(204)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialAgenciesWithBoats.length - 1)
  const agencyIds = agenciesAtEnd.map(a => a.id)
  expect(agencyIds).not.toContain(agencyToDelete.id)
  // Todo: Make sure all agency boats and their availabilities are deleted.
  const deletedAgencyBoatIds = agencyToDelete.boats
  const deletedAgencyBoats = await Boat.find({ _id: { $in: deletedAgencyBoatIds }, isDeleted: false })
  expect(deletedAgencyBoats).toHaveLength(0)
  const deletedAgencyBoatAvailabilities = await Availability.find({ boatId: { $in: deletedAgencyBoatIds }, isDeleted: false })
  expect(deletedAgencyBoatAvailabilities).toHaveLength(0)
})

afterAll(async () => {
  mongoose.connection.close()
})