import React, { useState } from 'react';
import { Send, User, Mail, MessageSquare, Phone, Building, CheckCircle, AlertCircle } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  description?: string;
  fields?: FormField[];
  showCompanyField?: boolean;
  showPhoneField?: boolean;
  showSubjectField?: boolean;
  submitButtonText?: string;
  onSubmit?: (data: Record<string, string>) => void;
  backgroundColor?: string;
  className?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  title = '연락하기',
  subtitle,
  description = '궁금한 점이나 문의사항이 있으시면 언제든 연락해 주세요. 최대한 빠르게 답변드리겠습니다.',
  fields,
  showCompanyField = true,
  showPhoneField = true,
  showSubjectField = true,
  submitButtonText = '메시지 보내기',
  onSubmit,
  backgroundColor = 'bg-secondary',
  className = ''
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultFields: FormField[] = [
    {
      id: 'name',
      label: '이름',
      type: 'text',
      placeholder: '홍길동',
      required: true
    },
    {
      id: 'email',
      label: '이메일',
      type: 'email',
      placeholder: 'example@email.com',
      required: true
    },
    ...(showCompanyField ? [{
      id: 'company',
      label: '회사명',
      type: 'text' as const,
      placeholder: '회사명을 입력해주세요'
    }] : []),
    ...(showPhoneField ? [{
      id: 'phone',
      label: '전화번호',
      type: 'tel' as const,
      placeholder: '010-1234-5678'
    }] : []),
    ...(showSubjectField ? [{
      id: 'subject',
      label: '제목',
      type: 'select' as const,
      required: true,
      options: ['일반 문의', '제품 문의', '기술 지원', '파트너십', '기타']
    }] : []),
    {
      id: 'message',
      label: '메시지',
      type: 'textarea',
      placeholder: '문의 내용을 자세히 작성해 주세요...',
      required: true
    }
  ];

  const formFields = fields || defaultFields;

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    formFields.forEach(field => {
      if (field.required && !formData[field.id]?.trim()) {
        newErrors[field.id] = `${field.label}은(는) 필수 입력 항목입니다.`;
      }
      
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = '올바른 이메일 주소를 입력해주세요.';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitStatus('success');
      setFormData({});
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <User className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'tel':
        return <Phone className="w-5 h-5" />;
      case 'textarea':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <Building className="w-5 h-5" />;
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.id];
    const baseClasses = `w-full px-4 py-3 pl-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
      hasError 
        ? 'border-red-300 focus:ring-red-500' 
        : 'border-theme focus:ring-accent-primary'
    }`;

    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">
            {getFieldIcon(field.type)}
          </div>
          
          {field.type === 'textarea' ? (
            <textarea
              rows={4}
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={baseClasses}
            />
          ) : field.type === 'select' ? (
            <select
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={baseClasses}
            >
              <option value="">선택해주세요</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={baseClasses}
            />
          )}
        </div>
        
        {hasError && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors[field.id]}
          </p>
        )}
      </div>
    );
  };

  if (submitStatus === 'success') {
    return (
      <section className={`contact-form py-16 md:py-24 ${backgroundColor} ${className}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4">메시지가 전송되었습니다!</h2>
            <p className="text-secondary mb-8">
              소중한 연락 감사합니다. 영업일 기준 24시간 이내에 답변드리겠습니다.
            </p>
            <button
              onClick={() => setSubmitStatus('idle')}
              className="btn-theme-primary px-6 py-3 rounded-lg font-semibold"
            >
              새 메시지 작성
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`contact-form py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            {subtitle && (
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-accent-primary/10 text-accent-primary text-sm font-medium rounded-full">
                  {subtitle}
                </span>
              </div>
            )}
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {title}
            </h2>
            
            {description && (
              <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
                {description}
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="card p-8 rounded-2xl shadow-theme">
              <form onSubmit={handleSubmit} className="space-y-6">
                {formFields.map(renderField)}
                
                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.</span>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-theme-primary py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      전송 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {submitButtonText}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Additional Info */}
            <div className="space-y-8">
              {/* Response Time */}
              <div className="card p-6 rounded-lg">
                <h3 className="font-bold mb-4">📞 빠른 응답</h3>
                <p className="text-secondary text-sm">
                  영업일 기준 24시간 이내에 답변드립니다. 긴급한 문의는 전화로 연락해 주세요.
                </p>
              </div>

              {/* FAQ Link */}
              <div className="card p-6 rounded-lg">
                <h3 className="font-bold mb-4">❓ 자주 묻는 질문</h3>
                <p className="text-secondary text-sm mb-4">
                  일반적인 질문은 FAQ에서 빠르게 확인하실 수 있습니다.
                </p>
                <button className="text-accent-primary font-medium text-sm hover:underline">
                  FAQ 보기 →
                </button>
              </div>

              {/* Privacy Notice */}
              <div className="p-4 bg-accent-primary/5 rounded-lg">
                <p className="text-xs text-secondary">
                  🔒 개인정보보호: 제공해주신 정보는 문의 응답 목적으로만 사용되며, 
                  관련 법령에 따라 안전하게 관리됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};