module.exports = {
  app: {
    base_url: 'http://127.0.0.1',
    port: 6090,
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
    //url: 'redis[s]://[[username][:password]@][host][:port][/db-number]'
    url: 'redis://127.0.0.1:6379/0'
  }
}
