const express = require('express')
const path = require('path')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportBearer = require('passport-http-bearer').Strategy
const got = require('got')
const redis = require('redis')
const fastProxy = require('fast-proxy')

const logger = require('../logger')('router:sync')
const { ClientError, ServerError } = require('../errors')

module.exports = function (app) {

  class Router {
    constructor () {
      const api = app.api

      const { proxy, close } = fastProxy({})

      passport.use(
        new passportBearer(async (token, done) => {
          try {
            /** verify incomming json web token validity **/
            const decoded = jwt.verify(token, app.config.app.secret, {})
            /** fetch token profile **/
            const response = await got(`${app.config.gateway.url}/api/session/profile?access_token=${token}`, {responseType: 'json'})
            done(null, response.body, token)
          } catch (err) {
            done(err)
          }
        })
      )

      api.use((req, res, next) => {
        logger.log('INCOMMING REQUEST %s %s %j', req.method, req.url, req.headers)
        next()
      })

      api.post(
        '/:customerName/task/:taskId/job',
        authenticationMiddleware,
        (req, res, next) => {
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
        },
        (req, res, next) => {
          requestHandlerMiddleware(req, res, (err, payload) => {
            // handled by error middleware
            if (err) { return next(err) }
            // prepare response
            res.status(200).json(payload)
          })
        }
      )
    }
  }

  const requestHandlerMiddleware = (req, res, next) => {
    try {
      // use job object reference
      let job = {}, response

      jobResultHandler(job, req)
        .then(payload => {
          next(null, payload)
        })
        .catch(err => {
          next(err)
        })


      redirectRequest(req)
        .then(response => {
          Object.assign(job, response.body)
        })
        .catch(err => {
          next(err)
        })
    } catch (err) {
      next(err)
    }
  }

  const authenticationMiddleware = (req, res, next) => {
    passport.authenticate('bearer', (err, profile, token) => {
      if (err) {
        logger.error('%o', err)

        if (err.name === 'HTTPError') {
          if (err.response.statusCode === 401) {
            return res.status(401).json('Unauthorized')
          } else {
            return res.status(err.response.statusCode).json(err.body)
          }
        }

        if (
          err.name === 'JsonWebTokenError' ||
          err.name === 'TokenExpiredError'
        ) {
          return res.status(401).json('Unauthorized')
        }

        next(err)
      } else if (!profile) {
        res.status(401).json('Unauthorized')
        //next(null, false)
      } else {
        req.user = profile
        req.token = token
        next()
      }
    }, { session: false })(req, res, next)
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

  const jobResultHandler = (job, context) => {
    const { user, params, token } = context

    const customer = user.current_customer
    const { taskId } = params
    const channel = `${customer.id}:task-completed:${taskId}`

    return new Promise( async (resolve, reject) => {
      let subscription = await subscribeQueue(channel)
      subscription.on('message', async (channel, message) => {
        try {
          logger.log(channel, message)
          let payload = JSON.parse(message)

          if (payload.data && payload.data.job_id) {
            if (payload.data.job_id === job.id) {
              subscription.unsubscribe(channel)
              // get updated job
              const api = app.config.supervisor.url
              const url = `${api}/${customer.name}/job/${job.id}?access_token=${token}`
              let response = await got(url, { responseType: 'json' })
              resolve(response.body)
            }
          } else {
            logger.error('Invalid Message Format')
            reject(new ServerError())
          }
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  const subscribeQueue = (channel) => {
    return new Promise( (resolve, reject) => {
      const redisClient = redis.createClient(app.config.redis)

      redisClient.on('message', (channel, message) => {
        // do nothing
      })

      redisClient.on('subscribe', (channel, count) => {
        logger.log(`subscription #${count} to "${channel}"`)
        resolve(redisClient)
      })

      redisClient.subscribe(channel)
    })
  }

  return new Router()

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

