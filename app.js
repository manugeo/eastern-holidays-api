const express = require('express')
const cors = require('cors')
require('express-async-errors') // This should be loaded before you import your routes
const app = express()
const agenciesRouter = require('./controllers/agencies')
const availabilitiesRouter = require('./controllers/availabilities')
const boatsRouter = require('./controllers/boats')
const { requestLogger, unknownEndpoint, errorHandler } = require('./utils/middleware')

// Todo: Restrict origins by setting cors options.
app.use(cors())
app.use(express.json())
app.use(requestLogger)

app.use('/api/agencies', agenciesRouter)
app.use('/api/availabilities', availabilitiesRouter)
app.use('/api/boats', boatsRouter)

app.use(unknownEndpoint)
// Note: This has to be the last loaded middleware.
app.use(errorHandler)

// Export the Express API
module.exports = app