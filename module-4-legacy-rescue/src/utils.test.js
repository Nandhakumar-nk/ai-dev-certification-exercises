// Characterization tests for utils.js — pin down CURRENT behavior (quirks included).
// Do not "fix" anything here; these tests exist so refactors can be checked against them.

import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { readFileContent, countWords, sortByCount, formatResults } = require('./utils')

describe('readFileContent', () => {
  it('reads an existing file and calls back with its content', () => {
    const filePath = path.join(os.tmpdir(), `utils-test-${Date.now()}.txt`)
    fs.writeFileSync(filePath, 'hello from disk')

    return new Promise((resolve, reject) => {
      readFileContent(filePath, (err, content) => {
        try {
          expect(err).toBeNull()
          expect(content).toBe('hello from disk')
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        } finally {
          fs.unlinkSync(filePath)
        }
      })
    })
  })

  it('calls back with an ENOENT error for a missing file (no throw)', () => {
    const missingPath = path.join(os.tmpdir(), `utils-test-missing-${Date.now()}.txt`)

    return new Promise((resolve, reject) => {
      readFileContent(missingPath, (err, content) => {
        try {
          expect(err).toBeTruthy()
          expect(err.code).toBe('ENOENT')
          expect(content).toBeUndefined()
          resolve()
        } catch (assertionError) {
          reject(assertionError)
        }
      })
    })
  })
})

describe('countWords', () => {
  it('counts word occurrences case-insensitively', () => {
    expect(countWords('Hello hello HELLO world')).toEqual({ hello: 3, world: 1 })
  })

  it('returns an empty object for an empty string', () => {
    expect(countWords('')).toEqual({})
  })

  it('returns an empty object for whitespace-only input', () => {
    expect(countWords('   \n\t  ')).toEqual({})
  })

  it('collapses multiple whitespace/newlines between words', () => {
    expect(countWords('foo   bar\n\nbaz')).toEqual({ foo: 1, bar: 1, baz: 1 })
  })

  it('strips punctuation entirely rather than treating it as a boundary (quirk)', () => {
    // apostrophe is removed, not replaced with a space -> "don't" becomes "dont"
    expect(countWords("don't don't")).toEqual({ dont: 2 })
  })

  it('merges hyphenated words into one token (quirk)', () => {
    expect(countWords('well-known well known')).toEqual({
      wellknown: 1,
      well: 1,
      known: 1,
    })
  })

  it('keeps digits as part of words', () => {
    expect(countWords('abc123 abc123 456')).toEqual({ abc123: 2, '456': 1 })
  })

  it('drops tokens that are pure punctuation', () => {
    expect(countWords('!!! hello !!! -- world')).toEqual({ hello: 1, world: 1 })
  })
})

describe('sortByCount', () => {
  it('sorts entries by count descending', () => {
    const result = sortByCount({ a: 1, b: 5, c: 3 })
    expect(result).toEqual([
      ['b', 5],
      ['c', 3],
      ['a', 1],
    ])
  })

  it('returns an empty array for an empty object', () => {
    expect(sortByCount({})).toEqual([])
  })

  it('preserves insertion order for tied counts (stable sort quirk)', () => {
    const result = sortByCount({ zebra: 2, apple: 2, mango: 2 })
    expect(result).toEqual([
      ['zebra', 2],
      ['apple', 2],
      ['mango', 2],
    ])
  })
})

describe('formatResults', () => {
  const shortSorted = [
    ['the', 5],
    ['fox', 3],
    ['dog', 2],
    ['lazy', 1],
  ]

  // 12 distinct entries, counts descending, so a 10-item cutoff is unambiguous
  // (needed to actually exercise the "default/zero limit -> 10" behavior below;
  // a list shorter than 10 would pass those tests without proving the cutoff).
  const longSorted = [
    ['w1', 12], ['w2', 11], ['w3', 10], ['w4', 9], ['w5', 8],
    ['w6', 7], ['w7', 6], ['w8', 5], ['w9', 4], ['w10', 3],
    ['w11', 2], ['w12', 1],
  ]
  const firstTenFormatted = longSorted
    .slice(0, 10)
    .map((entry, i) => `${i + 1}. ${entry[0]} (${entry[1]})\n`)
    .join('')

  it('numbers entries starting at 1 and formats as "N. word (count)"', () => {
    expect(formatResults(shortSorted, 2)).toBe('1. the (5)\n2. fox (3)\n')
  })

  it('defaults to a limit of 10 when limit is omitted, excluding the 11th+ entries', () => {
    const result = formatResults(longSorted)
    expect(result).toBe(firstTenFormatted)
    expect(result).not.toContain('w11')
  })

  it('treats a limit of 0 as "no limit given" and falls back to 10 (quirk: 0 || 10)', () => {
    const result = formatResults(longSorted, 0)
    expect(result).toBe(firstTenFormatted)
    expect(result).not.toContain('w11')
  })

  it('returns an empty string for an empty sorted list', () => {
    expect(formatResults([], 10)).toBe('')
  })

  it('returns an empty string when limit is negative (quirk: Math.min with negative max)', () => {
    expect(formatResults(shortSorted, -1)).toBe('')
  })

  it('caps at the number of available entries when limit exceeds the list length', () => {
    expect(formatResults(shortSorted, 100)).toBe(
      '1. the (5)\n2. fox (3)\n3. dog (2)\n4. lazy (1)\n'
    )
  })
})
