/**
 * [contact-form] 숏코드 컴포넌트
 * 동적 연락처 폼 생성 및 제출
 */

import React, { useState } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormData {
  [key: string]: string;
}

const ContactFormShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const {
    fields = 'name,email,message',
    title = 'Contact Us',
    submit_text = 'Send Message',
    success_message = 'Thank you! Your message has been sent.',
    to_email = '',
    subject = 'New Contact Form Submission',
    className = ''
  } = shortcode.attributes;

  // Parse fields configuration
  const parseFields = (): FormField[] => {
    const fieldNames = (fields as string).split(',').map(f => f.trim());
    
    return fieldNames.map(fieldName => {
      const [name, ...options] = fieldName.split(':');
      const isRequired = name.endsWith('*');
      const cleanName = name.replace('*', '');
      
      // Field type mapping
      const fieldTypeMap: { [key: string]: string } = {
        name: 'text',
        email: 'email',
        phone: 'tel',
        message: 'textarea',
        company: 'text',
        website: 'url',
        subject: 'text'
      };

      // Field label mapping
      const fieldLabelMap: { [key: string]: string } = {
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        message: 'Message',
        company: 'Company',
        website: 'Website',
        subject: 'Subject'
      };

      return {
        name: cleanName,
        type: fieldTypeMap[cleanName] || 'text',
        label: fieldLabelMap[cleanName] || cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        required: isRequired,
        placeholder: `Enter your ${fieldLabelMap[cleanName] || cleanName}`,
        options: options.length > 0 ? options[0].split('|') : undefined
      };
    });
  };

  const formFields = parseFields();

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormData = {};
    
    formFields.forEach(field => {
      const value = formData[field.name] || '';
      
      if (field.required && !value.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.type === 'email' && value && !isValidEmail(value)) {
        newErrors[field.name] = 'Please enter a valid email address';
      } else if (field.type === 'url' && value && !isValidUrl(value)) {
        newErrors[field.name] = 'Please enter a valid URL';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Submit form data
      const submissionData = {
        ...formData,
        to_email: to_email || undefined,
        subject,
        timestamp: new Date().toISOString(),
        source: 'contact-form-shortcode'
      };

      if (apiClient) {
        await apiClient.post('/contact/submit', submissionData);
      } else {
        // Fallback: simulate submission
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setSubmitStatus('success');
      setSubmitMessage(success_message);
      setFormData({});
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setSubmitMessage('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    
    const baseClasses = `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-500' : ''
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={baseClasses}
              required={field.required}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={baseClasses}
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={baseClasses}
              required={field.required}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className={`contact-form-shortcode success ${className}`}>
        <div className="contact-form-success bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-green-800 mb-2">Message Sent!</h3>
          <p className="text-green-700">{submitMessage}</p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="mt-4 text-green-600 hover:text-green-800 font-medium"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`contact-form-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className="contact-form bg-white border border-gray-200 rounded-lg p-6">
        {title && (
          <h2 className="contact-form-title text-2xl font-bold text-gray-900 mb-6">
            {title}
          </h2>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {formFields.map(renderField)}

          {submitStatus === 'error' && (
            <div className="form-error bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{submitMessage}</p>
            </div>
          )}

          <div className="form-submit">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                submit_text
              )}
            </button>
          </div>
        </form>
      </div>

      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Contact Form: {formFields.length} fields
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactFormShortcode;