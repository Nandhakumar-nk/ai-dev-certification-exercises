// server.js — HTTP API for word frequency analysis
// "it works, don't touch it" — original author, 2019

var http = require('http')
var url = require('url')
var analyzer = require('./analyzer')
var utils = require('./utils')
var path = require('path')

var PORT = 3457
var FILES_DIR = path.join(__dirname, '..')

function resolveSafePath(userPath) {
  var resolved = path.resolve(FILES_DIR, userPath)
  var rel = path.relative(FILES_DIR, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null
  }
  return resolved
}

var server = http.createServer(function(req, res) {
  var parsed = url.parse(req.url, true)

  if (parsed.pathname === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({status: 'ok'}))
    return
  }

  if (parsed.pathname === '/analyze' && req.method === 'GET') {
    var filepath = parsed.query.file
    if (!filepath) {
      res.writeHead(400, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({error: 'missing file parameter'}))
      return
    }

    var fullPath = resolveSafePath(filepath)
    if (!fullPath) {
      res.writeHead(400, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({error: 'invalid file path'}))
      return
    }

    analyzer.analyzeFile(fullPath, function(err, stats) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({error: err.message}))
        return
      }
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(stats))
    })
    return
  }

  if (parsed.pathname === '/analyze/text' && req.method === 'POST') {
    var body = ''
    req.on('data', function(chunk) {
      body = body + chunk
    })
    req.on('end', function() {
      var words = utils.countWords(body)
      var sorted = utils.sortByCount(words)
      var totalWords = 0
      for (var w in words) totalWords += words[w]

      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({
        totalWords: totalWords,
        uniqueWords: Object.keys(words).length,
        topWords: sorted.slice(0, 10)
      }))
    })
    return
  }

  if (parsed.pathname === '/format' && req.method === 'GET') {
    var file = parsed.query.file
    var limit = parseInt(parsed.query.limit) || 10

    if (!file) {
      res.writeHead(400, {'Content-Type': 'text/plain'})
      res.end('missing file parameter')
      return
    }

    var fullFormatPath = resolveSafePath(file)
    if (!fullFormatPath) {
      res.writeHead(400, {'Content-Type': 'text/plain'})
      res.end('invalid file path')
      return
    }

    analyzer.analyzeFile(fullFormatPath, function(err, stats) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'text/plain'})
        res.end('Error: ' + err.message)
        return
      }
      var formatted = utils.formatResults(stats.topWords, limit)
      res.writeHead(200, {'Content-Type': 'text/plain'})
      res.end('Word Frequency Analysis: ' + stats.filepath + '\n'
        + 'Total words: ' + stats.totalWords + '\n'
        + 'Unique words: ' + stats.uniqueWords + '\n\n'
        + formatted)
    })
    return
  }

  res.writeHead(404, {'Content-Type': 'application/json'})
  res.end(JSON.stringify({error: 'not found'}))
})

server.listen(PORT, function() {
  console.log('Legacy Word Analyzer running on http://localhost:' + PORT)
  console.log('')
  console.log('Endpoints:')
  console.log('  GET  /health              - Health check')
  console.log('  GET  /analyze?file=<path> - Analyze a file')
  console.log('  POST /analyze/text        - Analyze posted text')
  console.log('  GET  /format?file=<path>  - Formatted report')
})
