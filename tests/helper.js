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
  ],
  availabilities: [
    {
      "date": "2024-01-15T09:51:12.325Z",
      "isAvailable": false,
      "baseRate": 7500,
      "adultRate": 400,
      "childRate": 250
    },
    {
      "date": "2024-01-16T09:51:12.325Z",
      "isAvailable": true,
      "baseRate": 6000,
      "adultRate": 800,
      "childRate": 250
    },
    {
      "date": "2024-01-17T09:51:12.325Z",
      "isAvailable": true,
      "baseRate": 12000,
      "adultRate": 900,
      "childRate": 250
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

const requiredFeilds = {
  rate: ['date', 'baseRate', 'adultRate', 'childRate', 'infantRate'],
  agency: ['name'],
  boat: ['numberOfBedrooms', 'boatType', 'minAdultsRequired', 'defaultBaseRate', 'defaultAdultRate', 'defaultChildRate', 'agency'],
  availability: ['date', 'isAvailable', 'baseRate', 'adultRate', 'childRate', 'boat']
}

const docsInDb = async (model) => {
  const docs = await model.find({})
  return docs.map(doc => doc.toJSON())
}

module.exports = {
  initialDocs, validDocs, requiredFeilds, docsInDb
}