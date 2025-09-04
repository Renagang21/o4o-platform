/**
 * LogoUploader - Logo upload and site branding component
 */

import React, { useState, useCallback } from 'react'
import { Upload, X, Image, Type, Trash2 } from 'lucide-react'

interface LogoUploaderProps {
  logo?: string | null
  siteName?: string
  tagline?: string
  onUpdate: (updates: {
    logo?: string | null
    siteName?: string
    tagline?: string
  }) => void
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  logo,
  siteName = '',
  tagline = '',
  onUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      
      // TODO: Replace with actual media upload endpoint
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { url } = await response.json()
        onUpdate({ logo: url })
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      // console.error('Logo upload failed:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [onUpdate])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  // Remove logo
  const handleRemoveLogo = useCallback(() => {
    onUpdate({ logo: null })
  }, [onUpdate])

  // Handle text updates
  const handleSiteNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ siteName: e.target.value })
  }, [onUpdate])

  const handleTaglineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ tagline: e.target.value })
  }, [onUpdate])

  return (
    <div className="logo-uploader space-y-6">
      {/* Logo Upload Section */}
      <div className="logo-upload-section">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Logo
        </label>
        
        {logo ? (
          /* Logo Preview */
          <div className="logo-preview relative inline-block">
            <img
              src={logo}
              alt="Site Logo"
              className="max-w-xs max-h-20 object-contain border border-gray-200 rounded-lg"
            />
            <button
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Remove logo"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          /* Upload Area */
          <div
            className={`upload-area relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="upload-content">
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Uploading logo...</p>
                </>
              ) : (
                <>
                  <Image size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Recommended size: 200x60px for best display quality
        </p>
      </div>

      {/* Site Name */}
      <div className="site-name-section">
        <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-2">
          Site Name
        </label>
        <div className="relative">
          <Type size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            id="siteName"
            type="text"
            value={siteName}
            onChange={handleSiteNameChange}
            placeholder="Your Site Name"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This will appear in your site header and browser title
        </p>
      </div>

      {/* Tagline */}
      <div className="tagline-section">
        <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-2">
          Tagline <span className="text-gray-400">(Optional)</span>
        </label>
        <div className="relative">
          <Type size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={handleTaglineChange}
            placeholder="Just another great site"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          A short description of your site
        </p>
      </div>

      {/* Preview */}
      <div className="branding-preview bg-gray-50 p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
        <div className="preview-content flex items-center space-x-3">
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="h-8 object-contain"
            />
          ) : (
            <div className="h-8 w-12 bg-gray-200 rounded flex items-center justify-center">
              <Image size={16} className="text-gray-400" />
            </div>
          )}
          <div className="branding-text">
            <h3 className="font-semibold text-gray-900">
              {siteName || 'Your Site Name'}
            </h3>
            {tagline && (
              <p className="text-sm text-gray-600">{tagline}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogoUploader