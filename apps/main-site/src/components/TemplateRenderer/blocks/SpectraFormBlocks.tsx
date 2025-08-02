import { FC, FormEvent, useEffect, useState } from 'react';
import { 
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  Upload,
  Calendar,
  Hash,
  Type,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  Calculator,
  User,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import type { Form, FormField, FormFieldType, FormSubmission } from '@o4o/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Spectra Form Block - Renders dynamic forms created with form builder
export const SpectraFormBlock: FC<{
  formId?: string;
  formName?: string;
  showTitle?: boolean;
  showDescription?: boolean;
  customClasses?: string;
  submitButtonText?: string;
  submitButtonColor?: string;
  layout?: 'single' | 'two-column' | 'inline';
  theme?: 'default' | 'minimal' | 'modern';
}> = ({ 
  formId,
  formName,
  showTitle = true,
  showDescription = true,
  customClasses = '',
  submitButtonText,
  submitButtonColor = '#3b82f6',
  layout = 'single',
  theme = 'default'
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentPage, setCurrentPage] = useState(0);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Fetch form definition
  const { data: form, isLoading } = useQuery({
    queryKey: ['form', formId || formName],
    queryFn: async () => {
      const params = formId ? `/${formId}` : `?name=${formName}`;
      const response = await axios.get(`/api/forms${params}`);
      return response.data as Form;
    },
    enabled: !!(formId || formName)
  });

  // Initialize form data with default values
  useEffect(() => {
    if (form) {
      const initialData: Record<string, any> = {};
      form.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          initialData[field.name] = false;
        } else if (field.type === 'repeater') {
          initialData[field.name] = [];
        }
      });
      setFormData(initialData);
    }
  }, [form]);

  // Form submission
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await axios.post(`/api/forms/${form!.id}/submit`, data);
      return response.data;
    },
    onSuccess: (data) => {
      setSubmitStatus('success');
      setFormData({});
      
      // Handle confirmation actions
      if (data.confirmation) {
        if (data.confirmation.type === 'redirect' && data.confirmation.redirectUrl) {
          window.location.href = data.confirmation.redirectUrl;
        }
      }
    },
    onError: (error: any) => {
      setSubmitStatus('error');
      if (error.response?.data?.field) {
        setErrors({
          [error.response.data.field]: error.response.data.error
        });
      }
    }
  });

  // Validate field
  const validateField = (field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email address';
        }
        break;
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return 'Invalid URL';
        }
        break;
      case 'tel':
        if (value && !/^[\d\s\-+()]+$/.test(value)) {
          return 'Invalid phone number';
        }
        break;
      case 'number':
        if (value !== '' && value !== null) {
          const num = Number(value);
          if (isNaN(num)) return 'Must be a number';
          if (field.min !== undefined && num < field.min) {
            return `Must be at least ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            return `Must be at most ${field.max}`;
          }
        }
        break;
    }

    // Custom validation
    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return field.validation.errorMessage || 'Invalid format';
      }
    }

    return null;
  };

  // Handle field change
  const handleFieldChange = (field: FormField, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field.name]: value
    }));

    // Clear error for this field
    if (errors[field.name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.name];
        return newErrors;
      });
    }

    // Handle calculations
    if (form) {
      form.fields.forEach(f => {
        if (f.type === 'calculation' && f.calculation) {
          const result = evaluateFormula(f.calculation, { ...formData, [field.name]: value });
          setFormData(prev => ({
            ...prev,
            [f.name]: result
          }));
        }
      });
    }
  };

  // Evaluate conditional logic
  const evaluateCondition = (field: FormField): boolean => {
    if (!field.conditional) return true;
    
    const { action, rules, logicType } = field.conditional;
    const results = rules.map(rule => {
      const fieldValue = formData[rule.field];
      return evaluateRule(rule, fieldValue);
    });

    const conditionMet = logicType === 'all' 
      ? results.every(r => r)
      : results.some(r => r);

    return action === 'show' || action === 'enable' ? conditionMet : !conditionMet;
  };

  const evaluateRule = (rule: any, value: any): boolean => {
    switch (rule.operator) {
      case 'equals':
        return value == rule.value;
      case 'not_equals':
        return value != rule.value;
      case 'contains':
        return String(value).includes(String(rule.value));
      case 'greater_than':
        return Number(value) > Number(rule.value);
      case 'less_than':
        return Number(value) < Number(rule.value);
      case 'is_empty':
        return !value || value === '';
      case 'is_not_empty':
        return !!value && value !== '';
      default:
        return false;
    }
  };

  // Simple formula evaluation (safe parser without eval)
  const evaluateFormula = (formula: string, data: Record<string, any>): number => {
    try {
      let processedFormula = formula;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        processedFormula = processedFormula.replace(regex, String(Number(value) || 0));
      });
      
      // Safe mathematical expression evaluation without eval
      // This is a basic implementation that handles simple arithmetic
      const safeEval = (expr: string): number => {
        // Remove whitespace
        expr = expr.replace(/\s/g, '');
        
        // Basic arithmetic parser for +, -, *, /
        // For more complex expressions, consider using a library like math.js
        const numbers = expr.split(/[+\-*/]/).map(n => parseFloat(n));
        const operators = expr.match(/[+\-*/]/g) || [];
        
        if (numbers.length === 0) return 0;
        
        let result = numbers[0];
        for (let i = 0; i < operators.length; i++) {
          const nextNum = numbers[i + 1];
          switch (operators[i]) {
            case '+': result += nextNum; break;
            case '-': result -= nextNum; break;
            case '*': result *= nextNum; break;
            case '/': result = nextNum !== 0 ? result / nextNum : 0; break;
          }
        }
        
        return result;
      };
      
      return safeEval(processedFormula);
    } catch {
      return 0;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate all visible fields
    const newErrors: Record<string, string> = {};
    const visibleFields = form.fields.filter(field => evaluateCondition(field));
    
    for (const field of visibleFields) {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    setIsSubmitting(true);
    submitMutation.mutate(formData);
    setIsSubmitting(false);
  };

  // Get field icon
  const getFieldIcon = (type: FormFieldType) => {
    const icons: Record<string, any> = {
      text: Type,
      email: Mail,
      tel: Phone,
      url: Globe,
      date: Calendar,
      number: Hash,
      file: Upload,
      image: Upload,
      address: MapPin,
      rating: Star,
      calculation: Calculator,
      name: User,
      payment: CreditCard,
      password: Lock
    };
    return icons[type] || Type;
  };

  // Render field
  const renderField = (field: FormField) => {
    if (!evaluateCondition(field)) return null;

    const FieldIcon = getFieldIcon(field.type);
    const value = formData[field.name];
    const error = errors[field.name];
    const isDisabled = field.readonly || field.conditional?.action === 'disable';

    const fieldClasses = `
      ${field.width === 'half' ? 'md:col-span-1' : 'md:col-span-2'}
      ${field.cssClass || ''}
    `;

    return (
      <div key={field.id} className={fieldClasses}>
        {field.type === 'heading' ? (
          <h3 className="text-lg font-semibold mb-4">{field.label}</h3>
        ) : field.type === 'paragraph' ? (
          <p className="text-gray-600 mb-4">{field.label}</p>
        ) : field.type === 'divider' ? (
          <hr className="my-6" />
        ) : field.type === 'html' ? (
          <div dangerouslySetInnerHTML={{ __html: field.label }} className="mb-4" />
        ) : (
          <div className="mb-4">
            {field.label && field.type !== 'hidden' && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            
            {field.description && (
              <p className="text-sm text-gray-500 mb-2">{field.description}</p>
            )}

            <div className="relative">
              {/* Input icon */}
              {FieldIcon && !['heading', 'paragraph', 'divider', 'html', 'hidden'].includes(field.type) && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FieldIcon className="w-4 h-4" />
                </div>
              )}

              {/* Field input */}
              {renderFieldInput(field, value, isDisabled)}

              {/* Password toggle */}
              {field.type === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            {error && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render field input based on type
  const renderFieldInput = (field: FormField, value: any, isDisabled: boolean) => {
    const baseInputClasses = `
      w-full px-10 py-2 border rounded-md
      ${errors[field.name] ? 'border-red-300' : 'border-gray-300'}
      ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    `;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            rows={field.rows || 4}
            className={`${baseInputClasses} px-3`}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            disabled={isDisabled}
            className={baseInputClasses}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  disabled={isDisabled || option.disabled}
                  className="text-blue-600"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          // Multiple checkboxes
          return (
            <div className="space-y-2">
              {field.options.map(option => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      handleFieldChange(field, newValues);
                    }}
                    disabled={isDisabled || option.disabled}
                    className="text-blue-600"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleFieldChange(field, e.target.checked)}
                disabled={isDisabled}
                className="text-blue-600"
              />
              <span>{field.placeholder || 'Check this box'}</span>
            </label>
          );
        }

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFieldChange(field, rating)}
                disabled={isDisabled}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${
                    value >= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case 'range':
        return (
          <div>
            <input
              type="range"
              value={value || field.min || 0}
              onChange={(e) => handleFieldChange(field, Number(e.target.value))}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              disabled={isDisabled}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{field.min || 0}</span>
              <span className="font-medium">{value || field.min || 0}</span>
              <span>{field.max || 100}</span>
            </div>
          </div>
        );

      case 'file':
      case 'image':
        return (
          <input
            type="file"
            onChange={(e) => handleFieldChange(field, e.target.files?.[0])}
            accept={field.accept || (field.type === 'image' ? 'image/*' : '*')}
            disabled={isDisabled}
            multiple={field.multiple}
            className="w-full px-3 py-2 text-sm"
          />
        );

      case 'color':
        return (
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            disabled={isDisabled}
            className="h-10 w-full"
          />
        );

      case 'hidden':
        return (
          <input
            type="hidden"
            value={value || ''}
          />
        );

      case 'calculation':
        return (
          <div className="px-10 py-2 bg-gray-100 border border-gray-300 rounded-md">
            {value || 0}
          </div>
        );

      case 'password':
        return (
          <input
            type={showPassword[field.name] ? 'text' : 'password'}
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={baseInputClasses}
          />
        );

      default:
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            min={field.min}
            max={field.max}
            step={field.step}
            className={baseInputClasses}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Form not found</p>
      </div>
    );
  }

  if (submitStatus === 'success' && form.confirmations?.[0]) {
    const confirmation = form.confirmations[0];
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <div 
          className="text-lg"
          dangerouslySetInnerHTML={{ __html: confirmation.message || 'Thank you for your submission!' }}
        />
      </div>
    );
  }

  const themeClasses = {
    default: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200',
    minimal: 'bg-transparent p-4',
    modern: 'bg-gradient-to-br from-gray-50 to-white p-8 rounded-xl shadow-lg'
  };

  // Calculate pages for multi-page forms
  const pageBreaks = form.settings.multiPage ? form.settings.pageBreaks || [] : [];
  const pages: FormField[][] = [];
  let currentPageFields: FormField[] = [];
  
  form.fields.forEach((field, index) => {
    if (pageBreaks.includes(index) && currentPageFields.length > 0) {
      pages.push(currentPageFields);
      currentPageFields = [];
    }
    currentPageFields.push(field);
  });
  if (currentPageFields.length > 0) {
    pages.push(currentPageFields);
  }

  const totalPages = pages.length || 1;
  const currentFields = form.settings.multiPage ? pages[currentPage] || form.fields : form.fields;

  return (
    <div className={`${themeClasses[theme]} ${customClasses}`}>
      {showTitle && form.title && (
        <h2 className="text-2xl font-bold mb-2">{form.title}</h2>
      )}
      
      {showDescription && form.description && (
        <p className="text-gray-600 mb-6">{form.description}</p>
      )}

      {/* Progress bar for multi-page forms */}
      {form.settings.multiPage && form.settings.progressBar && totalPages > 1 && (
        <div className="mb-6">
          {form.settings.progressBarStyle === 'steps' ? (
            <div className="flex items-center justify-between">
              {pages.map((_, index) => (
                <div
                  key={index}
                  className={`flex items-center ${index < totalPages - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentPage
                        ? 'bg-green-500 text-white'
                        : index === currentPage
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentPage ? '✓' : index + 1}
                  </div>
                  {index < totalPages - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        index < currentPage ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600 text-center">
                Step {currentPage + 1} of {totalPages}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`
          ${layout === 'two-column' ? 'grid md:grid-cols-2 gap-4' : ''}
          ${layout === 'inline' ? 'flex flex-wrap gap-4' : ''}
        `}>
          {currentFields.map(field => renderField(field))}
        </div>

        <div className="flex items-center justify-between pt-4">
          {/* Multi-page navigation */}
          {form.settings.multiPage && totalPages > 1 && (
            <div className="flex gap-2">
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            {form.settings.multiPage && totalPages > 1 && currentPage < totalPages - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentPage(currentPage + 1)}
                className="flex items-center gap-2 px-6 py-2 text-white rounded-md hover:opacity-90"
                style={{ backgroundColor: submitButtonColor }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: submitButtonColor }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {form.settings.submitButtonProcessingText || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {submitButtonText || form.settings.submitButtonText || 'Submit'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Spectra View Block - Renders dynamic views created with view builder
export const SpectraViewBlock: FC<{
  viewId?: string;
  viewName?: string;
  showTitle?: boolean;
  customClasses?: string;
  itemsPerPage?: number;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
}> = ({
  viewId,
  viewName,
  showTitle = true,
  customClasses = '',
  itemsPerPage = 25,
  enableSearch = true,
  enableFilters = true,
  enableExport = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch view definition and data
  const { data: viewData, isLoading } = useQuery({
    queryKey: ['view', viewId || viewName, { search: searchTerm, filters, page, sortField, sortDirection }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewId) params.append('viewId', viewId);
      if (viewName) params.append('viewName', viewName);
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) {
        params.append('sort', sortField);
        params.append('direction', sortDirection);
      }
      params.append('page', String(page));
      params.append('limit', String(itemsPerPage));
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(`filter[${key}]`, value);
      });

      const response = await axios.get(`/api/views/render?${params}`);
      return response.data;
    },
    enabled: !!(viewId || viewName)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!viewData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>View not found</p>
      </div>
    );
  }

  const { view, data, total, totalPages } = viewData;

  return (
    <div className={`${customClasses}`}>
      {showTitle && view.title && (
        <h2 className="text-2xl font-bold mb-6">{view.title}</h2>
      )}

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        {enableSearch && view.interaction?.enableSearch && (
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Filters */}
        {enableFilters && view.interaction?.enableFilters && view.interaction.filterFields && (
          <div className="flex gap-4">
            {view.interaction.filterFields.map(field => (
              <select
                key={field}
                value={filters[field] || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, [field]: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All {field}</option>
                {/* Options would be populated based on field type */}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Data display based on visualization type */}
      {view.visualization.type === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {view.template.fields.map(field => (
                  <th
                    key={field}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField === field) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('asc');
                      }
                    }}
                  >
                    {field}
                    {sortField === field && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  {view.template.fields.map(field => (
                    <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item[field]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view.visualization.type === 'grid' ? (
        <div className={view.template.wrapperClass || 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {data.map((item: any, index: number) => (
            <div key={index} className={view.template.itemClass || 'bg-white rounded-lg shadow p-6'}>
              {view.template.fields.map(field => (
                <div key={field} className="mb-2">
                  <span className="font-medium">{field}:</span>
                  <span className="ml-2">{item[field]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : view.visualization.type === 'list' ? (
        <div className={view.template.wrapperClass || 'space-y-4'}>
          {data.map((item: any, index: number) => (
            <div key={index} className={view.template.itemClass || 'bg-white rounded-lg shadow p-4'}>
              {view.template.fields.map(field => (
                <div key={field} className="mb-1">
                  {item[field]}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};