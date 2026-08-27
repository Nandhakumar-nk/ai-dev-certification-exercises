// Characterization tests for analyzer.js — pin down CURRENT behavior.
// Written against the callback-hell implementation; must keep passing after
// the async/await rewrite so the two are proven behaviorally identical.

import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { analyzeFile, analyzeMultiple } = require('./analyzer')

function writeTempFile(content) {
  const filePath = path.join(os.tmpdir(), `analyzer-test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
  fs.writeFileSync(filePath, content)
  return filePath
}

describe('analyzeFile', () => {
  it('reads a file and returns totalWords/uniqueWords/topWords/filepath', () => {
    const filePath = writeTempFile('the quick fox the lazy fox the dog')

    return new Promise((resolve, reject) => {
      analyzeFile(filePath, (err, stats) => {
        try {
          expect(err).toBeNull()
          expect(stats.filepath).toBe(filePath)
          expect(stats.totalWords).toBe(8)
          expect(stats.uniqueWords).toBe(5)
          expect(stats.topWords[0]).toEqual(['the', 3])
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        } finally {
          fs.unlinkSync(filePath)
        }
      })
    })
  })

  it('calls back with an error for a missing file (no throw)', () => {
    const missingPath = path.join(os.tmpdir(), `analyzer-test-missing-${Date.now()}.txt`)

    return new Promise((resolve, reject) => {
      analyzeFile(missingPath, (err, stats) => {
        try {
          expect(err).toBeTruthy()
          expect(stats).toBeUndefined()
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        }
      })
    })
  })
})

describe('analyzeMultiple', () => {
  it('calls back with an empty array for an empty input', () => {
    return new Promise((resolve, reject) => {
      analyzeMultiple([], (err, results) => {
        try {
          expect(err).toBeNull()
          expect(results).toEqual([])
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        }
      })
    })
  })

  it('analyzes multiple files, preserving input order in the results', () => {
    const fileA = writeTempFile('alpha alpha beta')
    const fileB = writeTempFile('gamma delta delta delta')

    return new Promise((resolve, reject) => {
      analyzeMultiple([fileA, fileB], (err, results) => {
        try {
          expect(err).toBeNull()
          expect(results).toHaveLength(2)
          expect(results[0].filepath).toBe(fileA)
          expect(results[0].totalWords).toBe(3)
          expect(results[1].filepath).toBe(fileB)
          expect(results[1].totalWords).toBe(4)
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        } finally {
          fs.unlinkSync(fileA)
          fs.unlinkSync(fileB)
        }
      })
    })
  })

  it('calls back with an error when one of several paths is missing', () => {
    const fileA = writeTempFile('alpha beta')
    const missingPath = path.join(os.tmpdir(), `analyzer-test-missing-${Date.now()}.txt`)

    return new Promise((resolve, reject) => {
      analyzeMultiple([fileA, missingPath], (err, results) => {
        try {
          expect(err).toBeTruthy()
          expect(results).toBeUndefined()
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        } finally {
          fs.unlinkSync(fileA)
        }
      })
    })
  })
})
