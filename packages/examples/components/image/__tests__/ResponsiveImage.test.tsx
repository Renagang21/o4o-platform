// src/components/image/__tests__/ResponsiveImage.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResponsiveImage } from '../ResponsiveImage'
import { ProcessedImage } from '../../../services/image/types'

const mockImage: ProcessedImage = {
  original: '/uploads/test_original.jpg',
  variants: {
    thumbnail: '/uploads/test_thumb.webp',
    mobile: '/uploads/test_mobile.webp',
    tablet: '/uploads/test_tablet.webp',
    desktop: '/uploads/test_desktop.webp'
  },
  metadata: {
    width: 1920,
    height: 1080,
    format: 'jpg',
    size: 256000,
    aspectRatio: 1.78
  }
}

describe('ResponsiveImage', () => {
  it('renders without crashing', () => {
    render(<ResponsiveImage image={mockImage} alt="Test image" />)
    expect(screen.getByAltText('Test image')).toBeInTheDocument()
  })

  it('shows loading placeholder initially', () => {
    render(<ResponsiveImage image={mockImage} alt="Test image" />)
    // 로딩 중일 때는 이미지가 투명하게 표시됨
    const img = screen.getByAltText('Test image')
    expect(img).toHaveStyle('opacity: 0')
  })

  it('generates correct srcSet', () => {
    render(<ResponsiveImage image={mockImage} alt="Test image" />)
    const img = screen.getByAltText('Test image')
    expect(img).toHaveAttribute('srcset')
    expect(img.getAttribute('srcset')).toContain('640w')
    expect(img.getAttribute('srcset')).toContain('1024w')
    expect(img.getAttribute('srcset')).toContain('1920w')
  })

  it('shows quality toggle when enabled', () => {
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        showOriginalToggle={true} 
      />
    )
    expect(screen.getByText('원본')).toBeInTheDocument()
  })

  it('toggles between optimized and original quality', async () => {
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        showOriginalToggle={true} 
      />
    )
    
    const toggleButton = screen.getByText('원본')
    fireEvent.click(toggleButton)
    
    await waitFor(() => {
      expect(screen.getByText('최적화')).toBeInTheDocument()
    })
  })

  it('calls onLoad callback when image loads', async () => {
    const onLoad = jest.fn()
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        onLoad={onLoad}
      />
    )
    
    const img = screen.getByAltText('Test image')
    fireEvent.load(img)
    
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled()
    })
  })

  it('calls onError callback when image fails to load', async () => {
    const onError = jest.fn()
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        onError={onError}
      />
    )
    
    const img = screen.getByAltText('Test image')
    fireEvent.error(img)
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
  })

  it('shows error message when image fails to load', async () => {
    render(<ResponsiveImage image={mockImage} alt="Test image" />)
    
    const img = screen.getByAltText('Test image')
    fireEvent.error(img)
    
    await waitFor(() => {
      expect(screen.getByText('이미지를 불러올 수 없습니다')).toBeInTheDocument()
    })
  })

  it('sets loading="eager" for priority images', () => {
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        priority={true}
      />
    )
    
    const img = screen.getByAltText('Test image')
    expect(img).toHaveAttribute('loading', 'eager')
  })

  it('sets loading="lazy" for non-priority images', () => {
    render(
      <ResponsiveImage 
        image={mockImage} 
        alt="Test image" 
        priority={false}
      />
    )
    
    const img = screen.getByAltText('Test image')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
})
