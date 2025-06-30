import React, { useState } from 'react'
import { Settings, Plus, Trash2, Star, Quote } from 'lucide-react'

interface Testimonial {
  content: string
  author: string
  role: string
  company?: string
  avatar?: string
  rating?: number
}

interface TestimonialsProps {
  data: {
    testimonials: Testimonial[]
    showDots?: boolean
    autoplay?: boolean
    layout?: 'slider' | 'grid'
    columns?: number
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const Testimonials: React.FC<TestimonialsProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [editingTestimonial, setEditingTestimonial] = useState<number | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateTestimonial = (index: number, key: string, value: any) => {
    const newTestimonials = [...data.testimonials]
    newTestimonials[index] = { ...newTestimonials[index], [key]: value }
    updateData('testimonials', newTestimonials)
  }

  const addTestimonial = () => {
    const newTestimonials = [...data.testimonials, {
      content: '정말 훌륭한 서비스입니다!',
      author: '고객 이름',
      role: '직책',
      company: '회사명',
      rating: 5
    }]
    updateData('testimonials', newTestimonials)
  }

  const removeTestimonial = (index: number) => {
    const newTestimonials = data.testimonials.filter((_, i) => i !== index)
    updateData('testimonials', newTestimonials)
    if (currentSlide >= newTestimonials.length) {
      setCurrentSlide(Math.max(0, newTestimonials.length - 1))
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const renderTestimonial = (testimonial: Testimonial, index: number) => (
    <div
      key={index}
      className="relative bg-white rounded-lg p-6 shadow-md border border-gray-200"
      onClick={() => setEditingTestimonial(editingTestimonial === index ? null : index)}
    >
      {/* Delete Button */}
      {isSelected && data.testimonials.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeTestimonial(index)
          }}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-blue-500 mb-4" />

      {/* Rating */}
      {testimonial.rating && (
        <div className="mb-4">
          {renderStars(testimonial.rating)}
        </div>
      )}

      {/* Content */}
      <blockquote 
        className="text-gray-700 text-lg leading-relaxed mb-6"
        contentEditable={editingTestimonial === index}
        suppressContentEditableWarning
        onBlur={(e) => updateTestimonial(index, 'content', e.currentTarget.textContent)}
      >
        "{testimonial.content}"
      </blockquote>

      {/* Author Info */}
      <div className="flex items-center">
        {testimonial.avatar && (
          <img
            src={testimonial.avatar}
            alt={testimonial.author}
            className="w-12 h-12 rounded-full mr-4"
          />
        )}
        <div>
          <div 
            className="font-semibold text-gray-900"
            contentEditable={editingTestimonial === index}
            suppressContentEditableWarning
            onBlur={(e) => updateTestimonial(index, 'author', e.currentTarget.textContent)}
          >
            {testimonial.author}
          </div>
          <div className="text-sm text-gray-600">
            <span 
              contentEditable={editingTestimonial === index}
              suppressContentEditableWarning
              onBlur={(e) => updateTestimonial(index, 'role', e.currentTarget.textContent)}
            >
              {testimonial.role}
            </span>
            {testimonial.company && (
              <>
                <span> at </span>
                <span 
                  contentEditable={editingTestimonial === index}
                  suppressContentEditableWarning
                  onBlur={(e) => updateTestimonial(index, 'company', e.currentTarget.textContent)}
                >
                  {testimonial.company}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rating Editor */}
      {editingTestimonial === index && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-700 mb-2 block">평점</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation()
                  updateTestimonial(index, 'rating', star)
                }}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (testimonial.rating || 0) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Settings Button */}
      {isSelected && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      <div className="p-8">
        {data.layout === 'grid' ? (
          /* Grid Layout */
          <div className={`grid gap-6 ${
            data.columns === 1 ? 'grid-cols-1' :
            data.columns === 2 ? 'md:grid-cols-2' :
            'md:grid-cols-3'
          }`}>
            {data.testimonials.map((testimonial, index) => 
              renderTestimonial(testimonial, index)
            )}
            
            {/* Add Testimonial Button */}
            {isSelected && (
              <button
                onClick={addTestimonial}
                className="flex items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-500">후기 추가</span>
                </div>
              </button>
            )}
          </div>
        ) : (
          /* Slider Layout */
          <div className="max-w-4xl mx-auto">
            {data.testimonials.length > 0 && (
              <div className="relative">
                {renderTestimonial(data.testimonials[currentSlide], currentSlide)}
                
                {/* Navigation */}
                {data.testimonials.length > 1 && (
                  <div className="flex justify-center mt-6 gap-2">
                    {data.testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Add Button for Slider */}
            {isSelected && (
              <div className="text-center mt-6">
                <button
                  onClick={addTestimonial}
                  className="wp-button-secondary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  후기 추가
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">고객 후기 설정</h3>
          
          <div className="space-y-4">
            {/* Layout */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">레이아웃</label>
              <select
                value={data.layout || 'slider'}
                onChange={(e) => updateData('layout', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="slider">슬라이더</option>
                <option value="grid">그리드</option>
              </select>
            </div>

            {/* Columns (for grid) */}
            {data.layout === 'grid' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">열 개수</label>
                <select
                  value={data.columns || 2}
                  onChange={(e) => updateData('columns', parseInt(e.target.value))}
                  className="w-full rounded border-gray-300"
                >
                  <option value={1}>1열</option>
                  <option value={2}>2열</option>
                  <option value={3}>3열</option>
                </select>
              </div>
            )}

            {/* Autoplay (for slider) */}
            {data.layout === 'slider' && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.autoplay || false}
                    onChange={(e) => updateData('autoplay', e.target.checked)}
                    className="rounded mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">자동 재생</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Testimonials