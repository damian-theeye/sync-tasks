const express = require('express')
const got = require('got')
const fastProxy = require('fast-proxy')
const zlib = require('zlib')

const logger = require('../logger')('router:task')
const { ClientError, ServerError } = require('../errors')


module.exports = (app) => {
  const router = express.Router()

  const coreApi = app.config.supervisor.url
  const SYNCING_LIFECYCLE = 'syncing'

  const { proxy, close } = fastProxy({})

  router.post('/:customerName/task/:taskId/job',
    customerVerifyMiddleware,
    (req, res, next) => {
      const { query } = req
      requestHandlerMiddleware(req, res, (err, payload) => {
        // handled by error middleware
        if (err) { return next(err) }
        // prepare response

        const result = prepareJobResponse(payload, query)
        res.status(result.statusCode || 200)
        res.json(result.data)
      })
    }
  )

  const prepareJobResponse = (job, options) => {
    const result = {}

    if (options.hasOwnProperty('result')) {
      result.data = job.data
    } else if (options.hasOwnProperty('output')) {
      result.data = job.output
    } else {
      result.data = job // full job ejecution result
    }

    if (Array.isArray(job.output)) {
      try {
        const output = job.output
        const respData = JSON.parse(output[0]) // first index
        result.data = respData
        result.statusCode = respData?.statusCode
      } catch (jsonErr) {
        logger.log('output cannot be parsed')
      }
    }

    if (!result.statusCode) {
      // default. the job was executed
      if (job.state !== 'success') {
        result.statusCode = 500
      } else {
        result.statusCode = 200
      }
    }

    return result
  }

  //router.post('/task/:taskId/job', (req, res, next) => {
  //  const { query } = req
  //  requestHandlerMiddleware(req, res, (err, payload) => {
  //    // handled by error middleware
  //    if (err) { return next(err) }
  //    // prepare response

  //    res.status(200)

  //    if (query.hasOwnProperty('result')) {
  //      res.json(payload.result)
  //    } else if (query.hasOwnProperty('output')) {
  //      res.json(payload.output)
  //    } else {
  //      res.json(payload)
  //    }
  //  })
  //})

  const requestHandlerMiddleware = async (req, res, next) => {
    let channel
    try {
      const { user, params, token } = req 
      const customer = user.current_customer
      const { taskId } = params

      // ************************
      //
      // force syncing lifecycle
      //
      // ************************
      req.body.lifecycle = SYNCING_LIFECYCLE
      const { statusCode, body } = await redirectRequest(req)
      if (statusCode !== 200) {
        return next( new ClientError('Invalid Request', { statusCode, value: body }) )
      }

      // ************************
      //
      //  subscribe and wait for job execution finished message
      //
      // ************************
      const job = body
      channel = `${customer.id}:job-finished:${job.id}`
      app.service.redis.subscribe(channel, async (message) => {
        try {
          // stop listening in this channel
          app.service.redis.unsubscribe(channel)
          logger.log(`stopped listening ${channel} messages`)

          //const payload = JSON.parse(message)
          logger.log(message)

          const url = `${coreApi}/${customer.name}/job/${job.id}?access_token=${token}`
          let response = await got(url, { responseType: 'json' })
          next(null, response.body)
        } catch (err) {
          next(err)
        }
      })

      //const client = await redisSubscribe({
      //  channel,
      //  onMessage: async (message) => {
      //    try {
      //      // stop listening in this channel
      //      client.unsubscribe(channel)
      //      logger.log(`stopped listening ${channel} messages`)

      //      //const payload = JSON.parse(message)
      //      logger.log(message)

      //      const url = `${coreApi}/${customer.name}/job/${job.id}?access_token=${token}`
      //      let response = await got(url, { responseType: 'json' })
      //      next(null, response.body)
      //    } catch (err) {
      //      next(err)
      //    }
      //  }
      //})

      // ************************
      //
      //  send execute order
      //
      // ************************
      const url = `${coreApi}/job/${job.id}/synced?access_token=${token}`
      await got.put(url)
    } catch (err) {
      // on error unsubscribe
      app.service.redis.unsubscribe(channel)

      const response = err.response
      const statusCode = response?.statusCode

      if (!statusCode || statusCode >= 500) {
        return next( new ServerError('Internal Server Error', { statusCode }) )
      }

      if (statusCode >= 400) {
        const body = response.body
        return next( new ClientError(body.message, { statusCode }) )
      } 

      next(err)
    }
  }

  const redirectRequest = (req) => {
    return new Promise( (resolve, reject) => {
      proxy(req, new FakeResponse(), req.url, {
        base: app.config.supervisor.url,
        /**
         * @param {IncomingMessage} origReq original request
         * @param {FakeResponse} fakeRest mocked response. avoid overriding original headers
         * @param {IncomingMessage} apiRes supervisor api response
         */
        onResponse: (origReq, fakeRes, apiRes) => {

          const data = []
          apiRes.on('data', (chunck) => { data.push(chunck) })
          apiRes.on('end' , () => {
            try {
              const buffer = Buffer.concat(data)

              let str
              if (fakeRes.headers['content-encoding'] == 'gzip') {
                const dezipped = zlib.gunzipSync(buffer)
                str = dezipped.toString()
              } else {
                str = buffer.toString()
              }

              console.log(str)


              apiRes.rawBody = str
              apiRes.body = JSON.parse(str)
              resolve(apiRes)
            } catch (err) {
              console.error(err)
              reject(err)
            }
          })
        }
      })
    })
  }

  //async function redisSubscribe (options) {
  //  const { channel, onMessage } = options
  //  logger.log(`waiting ${channel}`)

  //  const redisClient = redis.createClient(app.config.redis)
  //  await redisClient.connect()

  //  redisClient.on('error', (err) => {
  //    console.log('Redis Client Error', err)
  //  })

  //  await redisClient.subscribe(channel, onMessage)

  //  return redisClient
  //}

  return router
}

// fake response object
class FakeResponse {
  constructor () {
    this.headers = []
  }

  setHeader (header, value) {
    this.headers[header] = value
  }

  end (message) {
    this.message = message
  }
}

const customerVerifyMiddleware = (req, res, next) => {
  if (!req.params.customerName) {
    let err = new ClientError('Invalid request', { code: 'ENOORG' })
    return next(err)
  }
  // verify session belongs to the organization
  if (req.params.customerName !== req.user.current_customer.name) {
    let err = new ClientError('Forbidden', { code: 'EORACC', statusCode: 403 })
    return next(err)
  }

  next()
}
