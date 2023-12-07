const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const config = require('./utils/config')
const logger = require('./utils/logger')

logger.info('connecting to', config.MONGODB_URI)
mongoose.connect(config.MONGODB_URI).then(() => {
  logger.info('connected to MongoDB')
}).catch((error) => {
  logger.info('error connecting to MongoDB:', error.message)
})

module.exports = mongoose