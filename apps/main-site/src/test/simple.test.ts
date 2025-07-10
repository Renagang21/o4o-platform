import { describe, it, expect } from 'vitest'

describe('Simple Test Suite', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with strings', () => {
    const message = 'Hello World'
    expect(message).toContain('World')
  })

  it('should work with arrays', () => {
    const items = [1, 2, 3]
    expect(items).toHaveLength(3)
    expect(items).toContain(2)
  })
})