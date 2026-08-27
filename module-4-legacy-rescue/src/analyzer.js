// analyzer.js — analyzes text files for word frequency

const utils = require('./utils')

function readFileContentAsync(filepath) {
  return new Promise(function(resolve, reject) {
    utils.readFileContent(filepath, function(err, content) {
      if (err) reject(err)
      else resolve(content)
    })
  })
}

async function analyzeFileAsync(filepath) {
  const content = await readFileContentAsync(filepath)
  const words = utils.countWords(content)
  const sorted = utils.sortByCount(words)
  const stats = {
    totalWords: 0,
    uniqueWords: Object.keys(words).length,
    topWords: sorted.slice(0, 10),
    filepath: filepath
  }
  // count total words (yes this is redundant, legacy code...)
  for (const word in words) {
    stats.totalWords = stats.totalWords + words[word]
  }
  return stats
}

async function analyzeFile(filepath, callback) {
  try {
    const stats = await analyzeFileAsync(filepath)
    callback(null, stats)
  } catch (err) {
    callback(err)
  }
}

async function analyzeMultiple(filepaths, callback) {
  if (filepaths.length === 0) {
    callback(null, [])
    return
  }

  try {
    const results = await Promise.all(filepaths.map(analyzeFileAsync))
    callback(null, results)
  } catch (err) {
    callback(err)
  }
}

module.exports = {
  analyzeFile: analyzeFile,
  analyzeMultiple: analyzeMultiple
}
