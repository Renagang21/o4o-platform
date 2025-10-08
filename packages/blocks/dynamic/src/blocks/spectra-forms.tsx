import React, { useState } from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface SpectraFormAttributes {
  formType: string;
  showLabels: boolean;
  submitText: string;
  successMessage: string;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'textarea';
  required: boolean;
}

interface BlockEditProps {
  attributes: SpectraFormAttributes;
  setAttributes: (attrs: Partial<SpectraFormAttributes>) => void;
}

interface BlockSaveProps {
  attributes: SpectraFormAttributes;
}

const Edit: React.FC<BlockEditProps> = ({ attributes, setAttributes }) => {
  const { formType, showLabels, submitText, successMessage } = attributes;
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'message', label: 'Message', type: 'textarea', required: false },
  ]);

  const handleFieldChange = (fieldId: string, property: string, value: string | boolean) => {
    setFormFields(fields => 
      fields.map(field => 
        field.id === fieldId ? { ...field, [property]: value } : field
      )
    );
  };
  
  return (
    <div className="wp-block-spectra-form">
      <div className="block-editor-block-toolbar">
        <select 
          value={formType || 'contact'} 
          onChange={(e) => setAttributes({ formType: e.target.value })}
        >
          <option value="contact">Contact Form</option>
          <option value="newsletter">Newsletter</option>
          <option value="feedback">Feedback</option>
        </select>
        
        <label>
          <input 
            type="checkbox" 
            checked={showLabels !== false} 
            onChange={(e) => setAttributes({ showLabels: e.target.checked })}
          />
          Show Labels
        </label>
        
        <input 
          type="text" 
          value={submitText || 'Submit'} 
          onChange={(e) => setAttributes({ submitText: e.target.value })}
          placeholder="Submit button text"
        />
      </div>
      
      <form className="spectra-form-preview">
        {formFields.map(field => (
          <div key={field.id} className="form-field">
            {showLabels !== false && (
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
            )}
            {field.type === 'textarea' ? (
              <textarea 
                placeholder={showLabels === false ? field.label : ''}
                required={field.required}
              />
            ) : (
              <input 
                type={field.type}
                placeholder={showLabels === false ? field.label : ''}
                required={field.required}
              />
            )}
          </div>
        ))}
        <button type="submit" className="wp-block-button__link">
          {submitText || 'Submit'}
        </button>
      </form>
      
      <div className="success-message-preview">
        <input 
          type="text" 
          value={successMessage || 'Thank you for your submission!'} 
          onChange={(e) => setAttributes({ successMessage: e.target.value })}
          placeholder="Success message"
          style={{ width: '100%', marginTop: '10px' }}
        />
      </div>
    </div>
  );
};

const Save: React.FC<BlockSaveProps> = ({ attributes }) => {
  const { formType, showLabels, submitText, successMessage } = attributes;
  
  return (
    <div 
      className="wp-block-spectra-form"
      data-form-type={formType}
      data-show-labels={showLabels}
      data-submit-text={submitText}
      data-success-message={successMessage}
    >
      {/* Form will be rendered client-side */}
    </div>
  );
};

const SpectraFormBlock: BlockDefinition = {
  name: 'o4o/spectra-form',
  title: 'Spectra Form',
  category: 'dynamic',
  icon: 'forms',
  description: 'Add a customizable form.',
  keywords: ['form', 'spectra', 'contact', 'newsletter'],
  
  attributes: {
    formType: {
      type: 'string',
      default: 'contact'
    },
    showLabels: {
      type: 'boolean',
      default: true
    },
    submitText: {
      type: 'string',
      default: 'Submit'
    },
    successMessage: {
      type: 'string',
      default: 'Thank you for your submission!'
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default SpectraFormBlock;