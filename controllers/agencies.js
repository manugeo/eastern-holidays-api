const agenciesRouter = require('express').Router()
const Agency = require('../models/agency')
const Availability = require('../models/availability')
const Boat = require('../models/boat')
const logger = require('../utils/logger')
const { getAllFieldsFromSchema, getRequiredFieldsFromSchema } = require('../utils/utils')

agenciesRouter.get('/', async (req, res) => {
  // Note: Only populating the 'boats' property when fetching a single agency by id.
  const agencies = await Agency.find({ isDeleted: false }).populate('boats')
  res.json(agencies)
})

agenciesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const agency = await Agency.findOne({ _id: id, isDeleted: false }).populate('boats')
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

  const agencyToBeUpdated = await Agency.findOne({ _id: id, isDeleted: false }).populate('boats')
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

agenciesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const agencyToBeDeleted = await Agency.findOne({ _id: id, isDeleted: false })
  if (!agencyToBeDeleted) {
    return res.status(404).json({ error: 'Agency not found' })
  }
  else {
    agencyToBeDeleted.isDeleted = true
    agencyToBeDeleted.deletedAt = new Date()
    const deletedAgency = await agencyToBeDeleted.save()
    if (!deletedAgency) {
      logger.error(`Failed to delete agency. id: ${id}`)
      return res.status(500).json({ error: 'Internal server error' })
    }
    else {
      // Housekeeping:
      // 1.When deleting an agency, delete all agency boats and their availabilities.
      for (const boatId of deletedAgency.boatIds) {
        const updatedBoat = await Boat.updateOne({ _id: boatId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() })
        if (!updatedBoat) {
          logger.error(`Failed to delete boat after deleting agency. boatId: ${boatId}, agencyId: ${deletedAgency._id}`)
        }
        const deletedAvailabilities = await Availability.updateMany({ boatId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } })
        if (!deletedAvailabilities || !deletedAvailabilities.modifiedCount) {
          logger.error(`Failed to delete boat availabilities after deleting agency. boatId: ${boatId}, agencyId: ${deletedAgency._id}`)
        }
      }

      return res.status(204).end()
    }
  }
})

module.exports = agenciesRouter