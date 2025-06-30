import React, { useState } from 'react'
import { Settings, Plus, Trash2, Image, X } from 'lucide-react'
import MediaSelector from '@/pages/media/components/MediaSelector'
import ResponsiveImage from '@/pages/media/components/ResponsiveImage'
import { MediaFile } from '@/types/content'

interface ImageGalleryProps {
  data: {
    images: Array<{ id: string; url: string; alt?: string; caption?: string }>
    columns: number
    spacing: 'tight' | 'normal' | 'loose'
    lightbox: boolean
    captions: boolean
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const handleImageSelect = (files: MediaFile[]) => {
    const newImages = files.map(file => ({
      id: file.id,
      url: file.url,
      alt: file.altText,
      caption: file.caption
    }))
    updateData('images', [...data.images, ...newImages])
    setShowMediaSelector(false)
  }

  const removeImage = (index: number) => {
    const newImages = data.images.filter((_, i) => i !== index)
    updateData('images', newImages)
  }

  const updateImageCaption = (index: number, caption: string) => {
    const newImages = [...data.images]
    newImages[index] = { ...newImages[index], caption }
    updateData('images', newImages)
  }

  const getGridClass = () => {
    const spacing = data.spacing === 'tight' ? 'gap-2' : data.spacing === 'loose' ? 'gap-8' : 'gap-4'
    const columns = `grid-cols-${Math.min(data.columns, 4)}`
    return `grid ${columns} ${spacing}`
  }

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
        {data.images.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">이미지 갤러리</h3>
            <p className="text-gray-500 mb-6">이미지를 추가하여 갤러리를 만들어보세요.</p>
            {isSelected && (
              <button
                onClick={() => setShowMediaSelector(true)}
                className="wp-button-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                이미지 추가
              </button>
            )}
          </div>
        ) : (
          /* Gallery Grid */
          <div className={getGridClass()}>
            {data.images.map((image, index) => (
              <div key={index} className="relative group">
                {/* Delete Button */}
                {isSelected && (
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* Image */}
                <div 
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => data.lightbox && setLightboxImage(image.url)}
                >
                  <ResponsiveImage
                    mediaId={image.id}
                    alt={image.alt || ''}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Caption */}
                {data.captions && (
                  <div className="mt-2">
                    <p 
                      className="text-sm text-gray-600 text-center"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                      onBlur={(e) => updateImageCaption(index, e.currentTarget.textContent || '')}
                    >
                      {image.caption || '캡션을 입력하세요'}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Add Image Button */}
            {isSelected && (
              <button
                onClick={() => setShowMediaSelector(true)}
                className="aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-500">이미지 추가</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Add Images Button (when gallery has images) */}
        {isSelected && data.images.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowMediaSelector(true)}
              className="wp-button-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              이미지 추가
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">갤러리 설정</h3>
          
          <div className="space-y-4">
            {/* Columns */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">열 개수</label>
              <select
                value={data.columns}
                onChange={(e) => updateData('columns', parseInt(e.target.value))}
                className="w-full rounded border-gray-300"
              >
                <option value={2}>2열</option>
                <option value={3}>3열</option>
                <option value={4}>4열</option>
              </select>
            </div>

            {/* Spacing */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">간격</label>
              <select
                value={data.spacing}
                onChange={(e) => updateData('spacing', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="tight">좁게</option>
                <option value="normal">보통</option>
                <option value="loose">넓게</option>
              </select>
            </div>

            {/* Lightbox */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.lightbox}
                  onChange={(e) => updateData('lightbox', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">라이트박스</span>
              </label>
            </div>

            {/* Captions */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.captions}
                  onChange={(e) => updateData('captions', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">캡션 표시</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Media Selector */}
      {showMediaSelector && (
        <MediaSelector
          allowedTypes={['image']}
          multiple={true}
          onSelect={handleImageSelect}
          onClose={() => setShowMediaSelector(false)}
        />
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={lightboxImage}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageGallery