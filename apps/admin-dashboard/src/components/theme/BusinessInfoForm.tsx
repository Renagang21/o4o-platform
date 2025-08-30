/**
 * BusinessInfoForm - Business information input form
 */

import React, { useCallback } from 'react'
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin
} from 'lucide-react'
import { BusinessInfo } from '@o4o/types'

interface BusinessInfoFormProps {
  businessInfo: BusinessInfo
  onUpdate: (updates: Partial<BusinessInfo>) => void
}

// Social media platform configurations
const SOCIAL_PLATFORMS = [
  { key: 'facebook' as const, name: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram' as const, name: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/youraccount' },
  { key: 'twitter' as const, name: 'Twitter/X', icon: Twitter, placeholder: 'https://twitter.com/youraccount' },
  { key: 'linkedin' as const, name: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/yourcompany' },
  { key: 'youtube' as const, name: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/channel/yourchannel' }
]

// Business hours configurations
const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
}

// Input field component
const InputField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  type?: string
  required?: boolean
  description?: string
}> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon, 
  type = 'text',
  required = false,
  description 
}) => {
  return (
    <div className="input-field">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          required={required}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}

// Textarea field component
const TextareaField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  description?: string
}> = ({ label, value, onChange, placeholder, rows = 3, description }) => {
  return (
    <div className="textarea-field">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      />
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}

export const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
  businessInfo,
  onUpdate
}) => {
  // Handle field updates
  const updateField = useCallback((field: keyof BusinessInfo, value: any) => {
    onUpdate({ [field]: value })
  }, [onUpdate])

  // Handle social media updates
  const updateSocialMedia = useCallback((platform: string, url: string) => {
    const currentSocial = businessInfo.socialMedia || {}
    updateField('socialMedia', {
      ...currentSocial,
      [platform]: url
    })
  }, [businessInfo.socialMedia, updateField])

  // Handle business hours updates
  const updateBusinessHours = useCallback((day: string, hours: { open: string; close: string; closed: boolean }) => {
    const currentHours = businessInfo.businessHours || {}
    updateField('businessHours', {
      ...currentHours,
      [day]: hours
    })
  }, [businessInfo.businessHours, updateField])

  return (
    <div className="business-info-form space-y-6">
      {/* Basic Information */}
      <div className="basic-info">
        <h3 className="text-base font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="space-y-4">
          <InputField
            label="Business Name"
            value={businessInfo.name || ''}
            onChange={(value) => updateField('name', value)}
            placeholder="Your Business Name"
            icon={Building}
            required
            description="This will be displayed in your site footer and contact information"
          />
          
          <TextareaField
            label="Description"
            value={businessInfo.description || ''}
            onChange={(value) => updateField('description', value)}
            placeholder="Tell visitors about your business..."
            description="A brief description of what your business does"
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="contact-info">
        <h3 className="text-base font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-4">
          <InputField
            label="Phone Number"
            value={businessInfo.phone || ''}
            onChange={(value) => updateField('phone', value)}
            placeholder="+1 (555) 123-4567"
            icon={Phone}
            type="tel"
            description="Primary contact phone number"
          />
          
          <InputField
            label="Email Address"
            value={businessInfo.email || ''}
            onChange={(value) => updateField('email', value)}
            placeholder="contact@yourbusiness.com"
            icon={Mail}
            type="email"
            description="Primary contact email address"
          />
          
          <TextareaField
            label="Address"
            value={businessInfo.address || ''}
            onChange={(value) => updateField('address', value)}
            placeholder="123 Main Street, City, State 12345"
            rows={2}
            description="Physical business address"
          />
          
          <InputField
            label="Website"
            value={businessInfo.website || ''}
            onChange={(value) => updateField('website', value)}
            placeholder="https://yourbusiness.com"
            icon={Globe}
            type="url"
            description="Your main business website (if different from this site)"
          />
        </div>
      </div>

      {/* Social Media */}
      <div className="social-media">
        <h3 className="text-base font-medium text-gray-900 mb-4">Social Media</h3>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map(platform => {
            const IconComponent = platform.icon
            const currentUrl = businessInfo.socialMedia?.[platform.key] || ''
            
            return (
              <div key={platform.key} className="social-platform">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {platform.name}
                </label>
                <div className="relative">
                  <IconComponent size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={currentUrl}
                    onChange={(e) => updateSocialMedia(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Social media links will appear in your site footer
        </p>
      </div>

      {/* Business Hours */}
      <div className="business-hours">
        <h3 className="text-base font-medium text-gray-900 mb-4">Business Hours</h3>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map(day => {
            const dayInfo = businessInfo.businessHours?.[day] || { open: '09:00', close: '17:00', closed: false }
            
            return (
              <div key={day} className="day-hours flex items-center space-x-4">
                <div className="day-label w-20 text-sm font-medium text-gray-700">
                  {DAY_LABELS[day]}
                </div>
                
                <div className="hours-control flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!dayInfo.closed}
                    onChange={(e) => updateBusinessHours(day, {
                      ...dayInfo,
                      closed: !e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  {!dayInfo.closed ? (
                    <>
                      <input
                        type="time"
                        value={dayInfo.open}
                        onChange={(e) => updateBusinessHours(day, {
                          ...dayInfo,
                          open: e.target.value
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={dayInfo.close}
                        onChange={(e) => updateBusinessHours(day, {
                          ...dayInfo,
                          close: e.target.value
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Closed</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Business hours help customers know when you're available
        </p>
      </div>

      {/* Preview */}
      <div className="business-info-preview bg-gray-50 p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information Preview</h4>
        <div className="preview-content space-y-2 text-sm">
          {businessInfo.name && (
            <div className="flex items-center">
              <Building size={14} className="mr-2 text-gray-400" />
              <span>{businessInfo.name}</span>
            </div>
          )}
          
          {businessInfo.phone && (
            <div className="flex items-center">
              <Phone size={14} className="mr-2 text-gray-400" />
              <span>{businessInfo.phone}</span>
            </div>
          )}
          
          {businessInfo.email && (
            <div className="flex items-center">
              <Mail size={14} className="mr-2 text-gray-400" />
              <span>{businessInfo.email}</span>
            </div>
          )}
          
          {businessInfo.address && (
            <div className="flex items-start">
              <MapPin size={14} className="mr-2 mt-0.5 text-gray-400" />
              <span>{businessInfo.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BusinessInfoForm