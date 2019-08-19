expect.extend({
  toMatchConfluentAvroEncodedPayload(...args) {
    return require('./matchers/toMatchConfluentAvroEncodedPayload')(this)(...args)
  },
})
