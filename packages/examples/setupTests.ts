// src/setupTests.ts
import '@testing-library/jest-dom'

// Mock global objects for testing
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock Canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
}))

// Mock FileReader
global.FileReader = class {
  result: string | ArrayBuffer | null = null
  readAsDataURL = jest.fn(() => {
    this.onload?.({ target: { result: 'data:image/jpeg;base64,mock' } } as any)
  })
  readAsArrayBuffer = jest.fn(() => {
    this.onload?.({ target: { result: new ArrayBuffer(8) } } as any)
  })
  onload: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
}

// Mock IntersectionObserver for lazy loading
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock network information API
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})
