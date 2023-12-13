const initialDocs = {
  rates: [
    {
      date: '2023-09-02T18:30:00.000Z',
      baseRate: 9000,
      adultRate: 500,
      childRate: 300,
      infantRate: 0
    },
    {
      date: '2022-05-02T18:30:00.000Z',
      baseRate: 12000,
      adultRate: 700,
      childRate: 450,
      infantRate: 0
    }
  ],
  boats: [
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
}

const validDocs = {
  rate: {
    date: '2023-09-02T18:30:00.000Z',
    baseRate: 9000,
    adultRate: 500,
    childRate: 300,
    infantRate: 0
  },
  boat: {
    numberOfBedrooms: 2,
    boatType: 'luxury',
    minAdultsRequired: 2,
    defaultBaseRate: 9000,
    defaultAdultRate: 1500,
    defaultChildRate: 750
  }
}

const docsInDb = async (model) => {
  const docs = await model.find({})
  return docs.map(doc => doc.toJSON())
}

module.exports = {
  initialDocs, validDocs, docsInDb
}