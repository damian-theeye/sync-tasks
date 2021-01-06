const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportBearer = require('passport-http-bearer').Strategy
const got = require('got')

const logger = require('../logger')('router:index')
const TaskRouter = require('./task')
const StatusRouter = require('./status')

class Router {
  constructor (app) {
    //this.app = app

    passport.use(
      new passportBearer(async (token, done) => {
        try {
          /** verify incomming json web token validity **/
          //const decoded = jwt.verify(token, app.config.app.secret, {})
          /** fetch token profile **/
          const response = await got(`${app.config.gateway.url}/api/session/profile?access_token=${token}`, {responseType: 'json'})
          done(null, response.body, token)
        } catch (err) {
          done(err)
        }
      })
    )

    let api = app.api

    api.use((req, res, next) => {
      logger.log('INCOMMING REQUEST %s %s %j', req.method, req.url, req.headers)
      next()
    })

    api.use('/api/status', StatusRouter(app))

    api.use(bearerAuthenticationMiddleware, TaskRouter(app))
  }
}

module.exports = Router

const bearerAuthenticationMiddleware = (req, res, next) => {
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
