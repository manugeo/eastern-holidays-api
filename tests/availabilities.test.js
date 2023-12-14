const Availability = require("../models/availability")
const { initialDocs } = require("./helper")
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

beforeEach(async () => {
  await Availability.deleteMany({})
  for (let availability of initialDocs.availabilities) {
    let availabilityObject = new Availability(availability)
    await availabilityObject.save()
  }
})

// Todo: Fix errors in the test.
test("all availabilities are returned", async () => {
  const response = await api.get("/api/availabilities")
  expect(response.body).toHaveLength(initialDocs.availabilities.length)
})