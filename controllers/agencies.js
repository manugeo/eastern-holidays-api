const agenciesRouter = require('express').Router()
const Agency = require('../models/agency')
const { requiredFeilds } = require('../tests/helper')

agenciesRouter.get('/', async (req, res) => {
  const agencies = await Agency.find({})
  res.json(agencies)
})

agenciesRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  const agency = await Agency.findById(id)
  if (agency) {
    res.json(agency)
  } else {
    res.status(404).json({ error: 'Agency not found' })
  }
})

agenciesRouter.post('/', async (req, res) => {
  const body = req.body
  for (const field of requiredFeilds.agency) {
    // eslint-disable-next-line eqeqeq
    if (body[field] == null) {
      res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  // Note: 'boats' property cannot be added from here. It gets added from the 'boats' router.
  const agency = new Agency({ name: body.name, boats: [] })
  const savedAgency = await agency.save()
  res.status(201).json(savedAgency)
})

agenciesRouter.put('/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body
  if (!body.name) {
    res.status(400).json({ error: 'Missing name' })
    return
  }
  // Note: 'boats' property cannot be updated from here. It gets updated from the 'boats' router.
  const agency = { name: body.name }
  const updatedAgency = await Agency.findByIdAndUpdate(id, agency, { new: true, runValidators: true, context: 'query' })
  if (!updatedAgency) {
    res.status(404).json({ error: 'Agency not found' })
  }
  else {
    res.json(updatedAgency)
  }
})

agenciesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id
  const deletedAgency = await Agency.findByIdAndDelete(id)
  if (deletedAgency) {
    res.status(204).end()
  }
  else {
    res.status(404).json({ error: 'Agency not found' })
  }
})

module.exports = agenciesRouter