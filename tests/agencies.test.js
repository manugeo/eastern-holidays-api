const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Agency = require("../models/agency")
const { initialDocs, docsInDb, validDocs, requiredFeilds } = require("./helper")

beforeEach( async () => {
  await Agency.deleteMany({})
  for (let agency of initialDocs.agencies) {
    let agencyObject = new Agency(agency)
    await agencyObject.save()
  }
})

test('all agencies are returned', async () => {
  const response = await api.get('/api/agencies')
  expect(response.body).toHaveLength(initialDocs.agencies.length)
})

test('a specific agency is within the returned agencies', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToView = agenciesAtStart[0]
  const resultAgency = await api.get(`/api/agencies/${agencyToView.id}`).expect(200).expect('Content-Type', /application\/json/)
  expect(resultAgency.body).toEqual(agencyToView)
})

test('agencies are returned as json', async () => {
  await api
    .get('/api/agencies')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('a valid agency can be added', async () => {
  await api
    .post('/api/agencies')
    .send(validDocs.agency)
    .expect(201)
    .expect('Content-Type', /application\/json/)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialDocs.agencies.length + 1)
  const names = agenciesAtEnd.map(a => a.name)
  expect(names).toContain(validDocs.agency.name)
})

describe('testing out agency creation using invalid data', () => {
  test.each(requiredFeilds.agency)('fails with correct message when missing %s', async (field) => {
    const agency = { ...validDocs.agency }
    delete agency[field]
    const response = await api.post('/api/agencies').send(agency)
    expect(response.status).toBe(400)
    expect(response.body.error).toContain(`Missing required field: ${field}`)
  })
})

test('an agency can be updated', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToUpdate = agenciesAtStart[0]
  const agency = { ...agencyToUpdate, name: 'Updated agency name' }
  await api
    .put(`/api/agencies/${agencyToUpdate.id}`)
    .send(agency)
    .expect(200)
    .expect('Content-Type', /application\/json/)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialDocs.agencies.length)
  const updatedAgency = agenciesAtEnd.find(a => a.id === agencyToUpdate.id)
  expect(updatedAgency.name).toBe(agency.name)
})

test('an agency can be deleted', async () => {
  const agenciesAtStart = await docsInDb(Agency)
  const agencyToDelete = agenciesAtStart[0]
  await api
    .delete(`/api/agencies/${agencyToDelete.id}`)
    .expect(204)
  const agenciesAtEnd = await docsInDb(Agency)
  expect(agenciesAtEnd).toHaveLength(initialDocs.agencies.length - 1)
  const agencyIds = agenciesAtEnd.map(a => a.id)
  expect(agencyIds).not.toContain(agencyToDelete.id)
})

afterAll(async () => {
  mongoose.connection.close()
})