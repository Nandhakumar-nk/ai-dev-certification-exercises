// utils.js — helper functions

import * as fs from 'fs'

type ReadFileCallback = (err: NodeJS.ErrnoException | null, data?: string) => void

async function readFileContent(path: string, cb: ReadFileCallback): Promise<void> {
  try {
    const data = await fs.promises.readFile(path, 'utf8')
    cb(null, data)
  } catch (err) {
    cb(err as NodeJS.ErrnoException)
  }
}

function countWords(text: string): Record<string, number> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(function(w) { return w.length > 0 })
  const counts: Record<string, number> = {}
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

function sortByCount(wordCounts: Record<string, number>): [string, number][] {
  const entries: [string, number][] = []
  for (const word in wordCounts) {
    entries.push([word, wordCounts[word]])
  }
  entries.sort(function(a, b) { return b[1] - a[1] })
  return entries
}

function formatResults(sorted: [string, number][], limit?: number): string {
  let result = ''
  const max = limit || 10
  for (let i = 0; i < Math.min(sorted.length, max); i++) {
    result = result + (i + 1) + '. ' + sorted[i][0] + ' (' + sorted[i][1] + ')\n'
  }
  return result
}

export { readFileContent, countWords, sortByCount, formatResults }
