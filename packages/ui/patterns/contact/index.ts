export { ContactForm } from './ContactForm';
export { ContactInfo } from './ContactInfo';
export { ContactMap } from './ContactMap';

// Contact pattern metadata for the block editor
export const contactPatterns = [
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: '연락처 양식과 폼',
    component: 'ContactForm',
    category: 'contact',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '연락하기',
      description: '궁금한 점이나 문의사항이 있으시면 언제든 연락해 주세요.',
      showCompanyField: true,
      showPhoneField: true,
      showSubjectField: true
    }
  },
  {
    id: 'contact-info',
    name: 'Contact Information',
    description: '연락처 정보 표시',
    component: 'ContactInfo',
    category: 'contact',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '연락처 정보',
      description: '언제든 편리한 방법으로 연락해 주세요.',
      layout: 'grid',
      showBusinessHours: true
    }
  },
  {
    id: 'contact-map',
    name: 'Location Map',
    description: '지도와 찾아오는 길',
    component: 'ContactMap',
    category: 'contact',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '찾아오시는 길',
      location: {
        name: '본사',
        address: '서울특별시 강남구 테헤란로 123'
      },
      mapProvider: 'placeholder',
      showDirections: true
    }
  }
];