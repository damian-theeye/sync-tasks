const express = require('express')
const path = require('path')
const http = require('http')
const https = require('https')
const passport = require('passport')
const Router = require('./router')
const logger = require('./logger')('app')
const EventEmitter = require('events')
const ErrorHandler = require('./errors')

class App extends EventEmitter {
  async configure (config) {
    this.config = config

    this.setupServices()

    this.setupApiMiddlewares()

    this.emit('configured')
  }

  start () {
    const port = this.config.app.port
    const server = this.server = this.api.listen(port, () => {
      logger.log(`API ready at port ${port}`)
    })

    //this.service.notifications.sockets.start(server)
  }

  setupRouter () {
    new Router(this)
  }

  setupServices () {
    // services
    this.service = {}
  }

  setupApiMiddlewares () {
    let api = this.api = express()
    api.use(express.json())
    api.use(express.urlencoded({ extended: true }))
    api.use(passport.initialize())

    // debug
    api.use((req, res, next) => {
      logger.log('INCOMMING REQUEST %s %s', req.method, req.url)
      next()
    })

    // cors
    api.use((req, res, next) => {
      let origin = (req.headers && (req.headers.origin||req.headers.Origin))
      // intercepts OPTIONS method. CORS
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin)
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Credentials', 'true')

      let headers = [
        'Origin',
        'Accept',
        'User-Agent',
        'Accept-Charset',
        'Cache-Control',
        'Accept-Encoding',
        'Content-Type',
        'Authorization',
        'Content-Length',
        'X-Requested-With'
      ]

      res.setHeader("Access-Control-Allow-Headers", headers.join(', '))

      if ('OPTIONS' === req.method.toUpperCase()) {
        //respond with 200
        res.status(204)
        res.setHeader('Content-Length', '0')
        res.end()
      } else {
        //move on
        next()
      }
    })

    this.setupRouter()

    // last route 404
    api.use((req, res, next) => {
      let payload = { message: `${req.path} not found`, status: 404 }
      logger.log(payload)
      res.status(payload.status)
      res.json(payload)
      return
    })

    // error middleware
    api.use((err, req, res, next) => {
      let statusCode = err.status || err.statusCode
      if (isClientError(statusCode) === true) {
        logger.log(`[${statusCode}] Invalid client request: ${err.message}`)
        //res.status(statusCode).json({ message: err.message })
        res.status(statusCode).json(err.toJSON())
      } else if (isServerError(statusCode)) {
        logger.error(err.stack)
        res.status(statusCode).json({ message: 'Internal Server Error' })
      } else {
        logger.error(err.stack)
        res.status(500).json({ message: 'Internal Server Error' })
      }
      res.sent = true
      res.error = err
      return
    })

    return api
  }
}

module.exports = App

const isClientError = (statusCode) => {
  return statusCode && statusCode >= 400 && statusCode < 500
}

const isServerError = (statusCode) => {
  return statusCode && statusCode >= 500
}
