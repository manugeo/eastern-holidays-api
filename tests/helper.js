const initialAgenciesWithBoats = [
  {
    name: 'Boat Company',
    phone: '1234567890',
    boatIds: [],
    boats: [
      {
        numberOfBedrooms: 2,
        boatType: 'luxury',
        minAdultsRequired: 2,
        defaultBaseRate: 9000,
        defaultAdultRate: 1500,
        defaultChildRate: 750,
        defaultInfantRate: 0,
        availabilityIds: []
      },
      {
        numberOfBedrooms: 1,
        boatType: 'premium',
        minAdultsRequired: 1,
        defaultBaseRate: 5000,
        defaultAdultRate: 1000,
        defaultChildRate: 500,
        defaultInfantRate: 0,
        availabilityIds: []
      }
    ]
  },
  {
    name: 'Holiday Inn',
    phone: '0987654321',
    boatIds: [],
    boats: [
      {
        numberOfBedrooms: 1,
        boatType: 'deluxe',
        minAdultsRequired: 1,
        defaultBaseRate: 5000,
        defaultAdultRate: 1000,
        defaultChildRate: 500,
        defaultInfantRate: 0,
        availabilityIds: []
      },
      {
        numberOfBedrooms: 3,
        boatType: 'premium',
        minAdultsRequired: 2,
        defaultBaseRate: 12000,
        defaultAdultRate: 1500,
        defaultChildRate: 750,
        defaultInfantRate: 0,
        availabilityIds: []
      }
    ]
  }
]

const initialDocs = {
  agencies: [
    {
      name: 'Boat Company',
      phone: '1234567890'
    },
    {
      name: 'Holiday Inn',
      phone: '0987654321'
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
      defaultInfantRate: 0
    },
    {
      numberOfBedrooms: 1,
      boatType: 'premium',
      minAdultsRequired: 1,
      defaultBaseRate: 5000,
      defaultAdultRate: 1000,
      defaultChildRate: 500,
      defaultInfantRate: 0
    }
  ],
  availabilities: [
    {
      date: "2024-01-14T18:30:00.000Z",
      isAvailable: false,
      baseRate: 7500,
      adultRate: 400,
      childRate: 250,
      infantRate: 0
    },
    {
      date: "2024-01-15T18:30:00.000Z",
      isAvailable: true,
      baseRate: 6000,
      adultRate: 800,
      childRate: 250,
      infantRate: 100
    }
  ]
}

const validDocs = {
  agency: {
    name: 'A Valid Boat Company',
    phone: '9447888888',
    boatIds: []
  },
  boat: {
    numberOfBedrooms: 2,
    boatType: 'luxury',
    minAdultsRequired: 2,
    defaultBaseRate: 9000,
    defaultAdultRate: 1500,
    defaultChildRate: 750,
    defaultInfantRate: 0,
    availabilityIds: []
  },
  availability: {
    date: "2024-02-15T18:30:00.000Z",
    isAvailable: true,
    baseRate: 12000,
    adultRate: 700,
    childRate: 300,
    infantRate: 0
  }
}

// Todo: Move requiredFeilds away from test helper.js (to config?)
const requiredFeilds = {
  agency: ['name', 'phone'],
  boat: ['numberOfBedrooms', 'boatType', 'minAdultsRequired', 'defaultBaseRate', 'defaultAdultRate', 'defaultChildRate', 'agencyId'],
  availability: ['date', 'isAvailable', 'baseRate', 'adultRate', 'childRate', 'boatId']
}

const docsInDb = async (model) => {
  const docs = await model.find({ isDeleted: false })
  return docs.map(doc => doc.toJSON())
}

module.exports = {
  initialAgenciesWithBoats, initialDocs, validDocs, requiredFeilds, docsInDb
}