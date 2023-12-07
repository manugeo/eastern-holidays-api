const Boat = require('../../models/boat')

const initialBoats = [
  {
    numberOfBedrooms: 2,
    boatType: 'luxury',
    minAdultsRequired: 2,
    defaultBaseRate: 9000,
    defaultAdultRate: 1500,
    defaultChildRate: 750,
    defaultInfantRate: 0,
  },
  {
    numberOfBedrooms: 1,
    boatType: 'premium',
    minAdultsRequired: 1,
    defaultBaseRate: 5000,
    defaultAdultRate: 1000,
    defaultChildRate: 500,
    defaultInfantRate: 0,
  }
]
const aValidBoat = {
  numberOfBedrooms: 2,
  boatType: 'luxury',
  minAdultsRequired: 2,
  defaultBaseRate: 9000,
  defaultAdultRate: 1500,
  defaultChildRate: 750
}

const nonExistingId = async () => {
  const boat = new Boat(initialBoats[0])
  await boat.save()
  await boat.deleteOne()
  return boat._id.toString()
}

const boatsInDb = async () => {
  const boats = await Boat.find({})
  return boats.map(boat => boat.toJSON())
}

module.exports = {
  initialBoats, aValidBoat, nonExistingId, boatsInDb
}