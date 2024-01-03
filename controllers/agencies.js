const agenciesRouter = require('express').Router()
const Agency = require('../models/agency')
const Availability = require('../models/availability')
const Boat = require('../models/boat')
const logger = require('../utils/logger')
const { getAllFieldsFromSchema, getRequiredFieldsFromSchema } = require('../utils/utils')

agenciesRouter.get('/', async (req, res) => {
  // Note: Only populating the 'boats' property when fetching a single agency by id.
  const agencies = await Agency.find({})
  res.json(agencies)
})

agenciesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const agency = await Agency.findById(id).populate('boats')
  if (agency) {
    res.json(agency)
  } else {
    res.status(404).json({ error: 'Agency not found' })
  }
})

agenciesRouter.post('/', async (req, res) => {
  const body = req.body
  const requiredFields = getRequiredFieldsFromSchema(Agency.schema)
  for (const field of requiredFields) {
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  const phone = (typeof body.phone === 'string') ? body.phone : body.phone.toString()
  if (phone.length !== 10 || !phone.match(/^[0-9]+$/)) {
    return res.status(400).json({ error: 'Invalid phone number. Should be a 10-digit number' })
  }
  // Note: 'boatIds' property cannot be added from here. It gets added from the 'boats' router.
  const agency = new Agency({ name: body.name, phone, boatIds: [] })
  const savedAgency = await agency.save()
  if (!savedAgency) {
    logger.error(`Failed to create agency. name: ${body.name}, phone: ${body.phone}`)
    return res.status(500).json({ error: 'Failed to create agency' })
  } else {
    return res.status(201).json(savedAgency)
  }
})

agenciesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body

  const agencyToBeUpdated = await Agency.findById(id).populate('boats')
  if (!agencyToBeUpdated) {
    return res.status(404).json({ error: 'Agency not found' })
  }

  const allFields = getAllFieldsFromSchema(Agency.schema)
  for (const field of allFields) {
    if (field === 'boatIds') continue // Note: 'boatIds' property cannot be updated from here. It gets updated from the 'boats' router.
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) continue
    if (field === 'phone') {
      const phone = (typeof body.phone === 'string') ? body.phone : body.phone.toString()
      if (phone.length !== 10 || !phone.match(/^[0-9]+$/)) {
        return res.status(400).json({ error: 'Invalid phone number. Should be a 10-digit number' })
      }
    }
    agencyToBeUpdated[field] = body[field]
  }
  const updatedAgency = await agencyToBeUpdated.save()
  if (!updatedAgency) {
    logger.error(`Failed to update agency. name: ${body.name}, phone: ${body.phone}`)
    return res.status(500).json({ error: 'Failed to update agency' })
  }
  else {
    return res.status(200).json(updatedAgency)
  }
})

// Todo: See if you could soft delete. Set the 'isDeleted' property to true. Set the 'deletedAt' property. And, filter out the docs when fetching, counting etc.
agenciesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const deletedAgency = await Agency.findByIdAndDelete(id)
  if (deletedAgency) {
    // Housekeeping:
    // 1.When deleting an agency, delete all agency boats and their availabilities.
    for (const boatId of deletedAgency.boatIds) {
      const deletedBoat = await Boat.findByIdAndDelete(boatId)
      if (!deletedBoat) {
        logger.error(`Failed to delete boat after deleting agency. boatId: ${boatId}, agencyId: ${deletedAgency._id}`)
      }
      const deletedAvailabilities = await Availability.deleteMany({ boatId })
      if (!deletedAvailabilities) {
        logger.error(`Failed to delete boat availabilities after deleting agency. boatId: ${boatId}, agencyId: ${deletedAgency._id}`)
      }
    }
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Agency not found' })
  }
})

module.exports = agenciesRouter