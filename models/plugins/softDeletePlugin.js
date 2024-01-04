const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  })

  // Note: Commented out the following middleware since it affects the uniqueValidator plugin.
  // Note: Apply middleware to various query methods.
  // Note: This approach may not cover every conceivable scenario, especially more complex custom queries or aggregations.
  // const softDeltedMethods = [
  //   'find',
  //   'findById',
  //   'findByIdAndDelete',
  //   'findByIdAndRemove',
  //   'findByIdAndUpdate',
  //   'findOne',
  //   'findOneAndDelete',
  //   'findOneAndRemove',
  //   'findOneAndUpdate',
  //   'count',
  //   'countDocuments',
  //   'estimatedDocumentCount',
  //   'update',
  //   'updateOne',
  //   'updateMany'
  // ]
  // schema.pre(softDeltedMethods, function (next) {
  //   this.where({ isDeleted: false })
  //   next()
  // })
}

module.exports = softDeletePlugin