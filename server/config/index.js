module.exports = {
  app: {
    base_url: 'http://127.0.0.1',
    port: 6081,
    secret: '692fc164a0c06a9fd02575cf17688c9e',
    supportEmail: 'info@theeye.io'
  },
  gateway: {
    url: 'http://127.0.0.1:6080'
  },
  supervisor: {
    url: 'http://127.0.0.1:60080'
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
}
