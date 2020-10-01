const express = require('express')
const got = require('got')
const redis = require('redis')
const fastProxy = require('fast-proxy')

const logger = require('../logger')('router:task')
const { ClientError, ServerError } = require('../errors')

module.exports = (app) => {
  const router = express.Router()

  const { proxy, close } = fastProxy({})

  router.post('/:customerName/task/:taskId/job',
    customerVerifyMiddleware,
    (req, res, next) => {
      const { query } = req
      requestHandlerMiddleware(req, res, (err, payload) => {
        // handled by error middleware
        if (err) { return next(err) }
        // prepare response

        res.status(200)

        if (query.hasOwnProperty('result')) {
          res.json(payload.result)
        } else if (query.hasOwnProperty('output')) {
          res.json(payload.output)
        } else {
          res.json(payload)
        }
      })
    }
  )

  const requestHandlerMiddleware = async (req, res, next) => {
    try {
      const { user, params, token } = req 
      const customer = user.current_customer
      const { taskId } = params

      const { statusCode, body } = await redirectRequest(req)

      if (statusCode !== 200) {
        return next( new ClientError(body.message, { statusCode }) )
      }

      const job = body
      const channel = `${customer.id}:job-finished:${job.id}`
      const subscription = await subscribeQueue(channel)
      const payload = await jobResultHandler(subscription, job, customer, token)
      next(null, payload)
    } catch (err) {
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
          let str = ''
          apiRes.on('data', d  => { if (d) { str += d } })
          apiRes.on('end' , () => {
            try {
              apiRes.rawBody = str
              apiRes.body = JSON.parse(str)
              resolve(apiRes)
            } catch (err) {
              console.error(err)
              reject(err)
            }
          })
          //res.status(200).json({ })
        }
      })
    })
  }

  const jobResultHandler = (subscription, job, customer, token) => {
    return new Promise( async (resolve, reject) => {
      subscription.on('message', async (channel, message) => {
        try {
          // stop listening in this channel
          subscription.unsubscribe(channel)
          logger.log(`stopped listening ${channel} messages`)

          logger.log(channel, message)
          let payload = JSON.parse(message)

          const api = app.config.supervisor.url
          const url = `${api}/${customer.name}/job/${job.id}?access_token=${token}`
          let response = await got(url, { responseType: 'json' })
          resolve(response.body)

          //if (payload.data && payload.data.job_id) {
          //  if (payload.data.job_id === job.id) {
          //    // get updated job
          //  }
          //} else {
          //  logger.error('Invalid Message Format')
          //  reject(new ServerError())
          //}
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  const subscribeQueue = (channel) => {
    logger.log(`waiting ${channel}`)
    return new Promise( (resolve, reject) => {
      const redisClient = redis.createClient(app.config.redis)

      redisClient.on('message', (channel, message) => {
        // do nothing
      })

      redisClient.on('subscribe', (channel, count) => {
        logger.log(`subscribed to "${channel}"`)
        resolve(redisClient)
      })

      redisClient.subscribe(channel)
    })
  }

  return router
}

// fake response object
class FakeResponse {
  constructor () {
  }

  setHeader (header) {
    this.header = header
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
