'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()
const safeStringify = require('fast-safe-stringify')

const schema = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

const nullSchema = {
  schema: {
    response: {
      '2xx': {
        type: 'null'
      }
    }
  }
}

const numberSchema = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'number'
          }
        }
      }
    }
  }
}

const querySchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        hello: {
          type: 'integer'
        }
      }
    }
  }
}

const paramsSchema = {
  schema: {
    params: {
      type: 'object',
      properties: {
        foo: {
          type: 'string'
        },
        test: {
          type: 'integer'
        }
      }
    }
  }
}

const headersSchema = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        'x-test': {
          type: 'number'
        }
      }
    }
  }
}

test('shorthand - get', t => {
  t.plan(1)
  try {
    fastify.get('/', schema, function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get (return null)', t => {
  t.plan(1)
  try {
    fastify.get('/null', nullSchema, function (req, reply) {
      reply.code(200).send(null)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get params', t => {
  t.plan(1)
  try {
    fastify.get('/params/:foo/:test', paramsSchema, function (req, reply) {
      reply.code(200).send(req.params)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get, querystring schema', t => {
  t.plan(1)
  try {
    fastify.get('/query', querySchema, function (req, reply) {
      reply.code(200).send(req.query)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get, headers schema', t => {
  t.plan(1)
  try {
    fastify.get('/headers', headersSchema, function (req, reply) {
      reply.code(200).send(req.headers)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('missing schema - get', t => {
  t.plan(1)
  try {
    fastify.get('/missing', function (req, reply) {
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('wrong object for schema - get', t => {
  t.plan(1)
  try {
    fastify.get('/wrong-object-for-schema', numberSchema, function (req, reply) {
      // will send { hello: null }
      reply.code(200).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('custom serializer - get', t => {
  t.plan(1)
  try {
    fastify.get('/custom-serializer', numberSchema, function (req, reply) {
      reply.code(200).serializer(safeStringify).send({ hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('empty response', t => {
  t.plan(1)
  try {
    fastify.get('/empty', function (req, reply) {
      reply.code(200).send()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('send a falsy boolean', t => {
  t.plan(1)
  try {
    fastify.get('/boolean', function (req, reply) {
      reply.code(200).send(false)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - request get', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request get params schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { foo: 'world', test: 123 })
    })
  })

  test('shorthand - request get params schema error', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/params/world/string'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '.test',
          schemaPath: '#/properties/test/type',
          params: { type: 'integer' },
          message: 'should be integer'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request get headers schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      headers: {
        'x-test': 1
      },
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.strictEqual(JSON.parse(body)['x-test'], 1)
    })
  })

  test('shorthand - request get headers schema error', t => {
    t.plan(3)
    sget({
      method: 'GET',
      headers: {
        'x-test': 'abc'
      },
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '[\'x-test\']',
          schemaPath: '#/properties/x-test/type',
          params: { type: 'number' },
          message: 'should be number'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request get querystring schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=123'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 123 })
    })
  })

  test('shorthand - request get querystring schema error', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/query?hello=world'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.deepEqual(JSON.parse(body), {
        error: 'Bad Request',
        message: JSON.stringify([{
          keyword: 'type',
          dataPath: '.hello',
          schemaPath: '#/properties/hello/type',
          params: { type: 'integer' },
          message: 'should be integer'
        }]),
        statusCode: 400
      })
    })
  })

  test('shorthand - request get missing schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request get missing schema', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/wrong-object-for-schema'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: null })
    })
  })

  test('shorthand - custom serializer', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/custom-serializer'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - empty response', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/empty'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '0')
      t.deepEqual(body.toString(), '')
    })
  })

  test('shorthand - send a falsy boolean', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/boolean'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'false')
    })
  })

  test('shorthand - send null value', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/null'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), 'null')
    })
  })
})
