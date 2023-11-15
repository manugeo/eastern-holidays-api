const isValidDateString = (dateString) => {
  // Use a regular expression to check if the string follows the expected format
  const isoStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/

  if (!isoStringRegex.test(dateString)) {
    return false // Return false if the format is incorrect
  }

  // Attempt to create a Date object with the provided string
  const dateObject = new Date(dateString)

  // Check if the created Date object is valid
  if (isNaN(dateObject.getTime())) {
    return false // Return false if the date is invalid
  }

  return true // Return true if the date is valid
}

module.exports = {
  isValidDateString
}