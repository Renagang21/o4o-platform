import { describe, it, expect } from 'vitest'
import { render, screen } from './utils'

// Simple example test component
const TestComponent = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <button>Click me</button>
    </div>
  )
}

describe('Example Test Suite', () => {
  it('renders test component correctly', () => {
    render(<TestComponent />)
    
    expect(screen.getByText('Test Component')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('demonstrates testing library matchers', () => {
    render(<TestComponent />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Test Component')
    
    const button = screen.getByRole('button')
    expect(button).toBeVisible()
    expect(button).toBeEnabled()
  })
})