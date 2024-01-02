/* eslint-disable no-undef */
require('dotenv').config()

const PORT = process.env.PORT || 3001

const MONGODB_URI = (process.env.NODE_ENV === 'production')
  ? process.env.MONGODB_URI
  : (process.env.NODE_ENV === 'test')
    ? process.env.TEST_MONGODB_URI
    : process.env.DEV_MONGODB_URI

const ALL_FIELDS = {
  agency: ['name', 'phone', 'boatIds'],
  boat: ['numberOfBedrooms', 'boatType', 'minAdultsRequired', 'defaultBaseRate', 'defaultAdultRate', 'defaultChildRate', 'agencyId', 'availabilityIds'],
  availability: ['date', 'isAvailable', 'baseRate', 'adultRate', 'childRate', 'infantRate', 'boatId']
}

module.exports = {
  PORT,
  MONGODB_URI,
  ALL_FIELDS
}