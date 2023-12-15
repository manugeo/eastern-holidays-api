/* eslint-disable no-undef */
require('dotenv').config()

const PORT = process.env.PORT || 3001

const MONGODB_URI = (process.env.NODE_ENV === 'production')
  ? process.env.MONGODB_URI
  : (process.env.NODE_ENV === 'test')
    ? process.env.TEST_MONGODB_URI
    : process.env.DEV_MONGODB_URI

module.exports = {
  PORT,
  MONGODB_URI
}