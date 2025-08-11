/**
 * ACF Field Renderers
 * 
 * Components for rendering different ACF field types
 */


interface BaseFieldProps {
  value: any;
  label?: string;
  name: string;
  type: string;
  showLabel?: boolean;
}

// Text field renderer
export const TextFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--text">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">{value}</div>
    </div>
  );
};

// Textarea field renderer
export const TextareaFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--textarea">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div 
        className="o4o-acf-field__value"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
};

// Image field renderer
export const ImageFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  // Handle different return formats
  let imageUrl = '';
  let imageAlt = '';

  if (typeof value === 'string') {
    imageUrl = value;
  } else if (typeof value === 'number') {
    // ID format - would need to fetch image data
    return null;
  } else if (value.url) {
    imageUrl = value.url;
    imageAlt = value.alt || value.title || '';
  }

  if (!imageUrl) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--image">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <img 
          src={imageUrl} 
          alt={imageAlt}
          className="o4o-acf-field__image"
        />
      </div>
    </div>
  );
};

// URL field renderer
export const UrlFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--url">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="o4o-acf-field__link"
        >
          {value}
        </a>
      </div>
    </div>
  );
};

// Email field renderer
export const EmailFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--email">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <a 
          href={`mailto:${value}`}
          className="o4o-acf-field__link"
        >
          {value}
        </a>
      </div>
    </div>
  );
};

// Number field renderer
export const NumberFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (value === null || value === undefined) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--number">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">{value}</div>
    </div>
  );
};

// Select field renderer
export const SelectFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  // Handle multiple values
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <div className="o4o-acf-field o4o-acf-field--select">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">{displayValue}</div>
    </div>
  );
};

// Checkbox field renderer
export const CheckboxFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  const values = Array.isArray(value) ? value : [value];

  return (
    <div className="o4o-acf-field o4o-acf-field--checkbox">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <ul className="o4o-acf-field__checkbox-list">
          {values.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// True/False field renderer
export const TrueFalseFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  return (
    <div className="o4o-acf-field o4o-acf-field--true-false">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <span className={`o4o-acf-field__boolean o4o-acf-field__boolean--${value ? 'true' : 'false'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );
};

// Date field renderer
export const DateFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  // Format date
  const date = new Date(value);
  const formattedDate = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="o4o-acf-field o4o-acf-field--date">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <time dateTime={value}>{formattedDate}</time>
      </div>
    </div>
  );
};

// Color field renderer
export const ColorFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--color">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <span 
          className="o4o-acf-field__color-swatch"
          style={{ backgroundColor: value }}
          title={value}
        />
        <span className="o4o-acf-field__color-value">{value}</span>
      </div>
    </div>
  );
};

// File field renderer
export const FileFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value) return null;

  let fileUrl = '';
  let fileName = '';

  if (typeof value === 'string') {
    fileUrl = value;
    fileName = value.split('/').pop() || value;
  } else if (value.url) {
    fileUrl = value.url;
    fileName = value.filename || value.title || fileUrl.split('/').pop() || '';
  }

  if (!fileUrl) return null;

  return (
    <div className="o4o-acf-field o4o-acf-field--file">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <a 
          href={fileUrl} 
          download
          className="o4o-acf-field__file-link"
        >
          📎 {fileName}
        </a>
      </div>
    </div>
  );
};

// Relationship field renderer
export const RelationshipFieldRenderer = ({ value, label, showLabel = true }: BaseFieldProps) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  const posts = Array.isArray(value) ? value : [value];

  return (
    <div className="o4o-acf-field o4o-acf-field--relationship">
      {showLabel && label && (
        <div className="o4o-acf-field__label">{label}</div>
      )}
      <div className="o4o-acf-field__value">
        <ul className="o4o-acf-field__relationship-list">
          {posts.map((post, index) => (
            <li key={index}>
              {typeof post === 'object' ? (
                <a href={post.link || '#'}>
                  {post.title?.rendered || post.post_title || 'Untitled'}
                </a>
              ) : (
                post
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Main field renderer component
export const ACFFieldRenderer = ({ 
  field, 
  value,
  showLabel = true 
}: { 
  field: any; 
  value: any;
  showLabel?: boolean;
}) => {
  const props = {
    value,
    label: field.customLabel || field.label,
    name: field.name,
    type: field.type,
    showLabel,
  };

  switch (field.type) {
    case 'text':
      return <TextFieldRenderer {...props} />;
    
    case 'textarea':
    case 'wysiwyg':
      return <TextareaFieldRenderer {...props} />;
    
    case 'image':
      return <ImageFieldRenderer {...props} />;
    
    case 'url':
      return <UrlFieldRenderer {...props} />;
    
    case 'email':
      return <EmailFieldRenderer {...props} />;
    
    case 'number':
    case 'range':
      return <NumberFieldRenderer {...props} />;
    
    case 'select':
    case 'radio':
      return <SelectFieldRenderer {...props} />;
    
    case 'checkbox':
      return <CheckboxFieldRenderer {...props} />;
    
    case 'true_false':
      return <TrueFalseFieldRenderer {...props} />;
    
    case 'date_picker':
    case 'date_time_picker':
    case 'time_picker':
      return <DateFieldRenderer {...props} />;
    
    case 'color_picker':
      return <ColorFieldRenderer {...props} />;
    
    case 'file':
      return <FileFieldRenderer {...props} />;
    
    case 'relationship':
    case 'post_object':
    case 'page_link':
      return <RelationshipFieldRenderer {...props} />;
    
    default:
      // Fallback for unknown field types
      return <TextFieldRenderer {...props} />;
  }
};