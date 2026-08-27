// utils.js — helper functions (no docs, inconsistent style, var everywhere)

const fs = require('fs')

async function readFileContent(path, cb) {
  try {
    const data = await fs.promises.readFile(path, 'utf8')
    cb(null, data)
  } catch (err) {
    cb(err)
  }
}

function countWords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(function(w) { return w.length > 0 })
  const counts = {}
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (counts[w]) {
      counts[w] = counts[w] + 1
    } else {
      counts[w] = 1
    }
  }
  return counts
}

function sortByCount(wordCounts) {
  const entries = []
  for (const word in wordCounts) {
    entries.push([word, wordCounts[word]])
  }
  entries.sort(function(a, b) { return b[1] - a[1] })
  return entries
}

function formatResults(sorted, limit) {
  let result = ''
  const max = limit || 10
  for (let i = 0; i < Math.min(sorted.length, max); i++) {
    result = result + (i + 1) + '. ' + sorted[i][0] + ' (' + sorted[i][1] + ')\n'
  }
  return result
}

module.exports = {
  readFileContent: readFileContent,
  countWords: countWords,
  sortByCount: sortByCount,
  formatResults: formatResults
}
