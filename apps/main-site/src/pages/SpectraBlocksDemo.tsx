import { FC } from 'react';
import TemplateRenderer from '../components/TemplateRenderer';

const SpectraBlocksDemo: FC = () => {
  // Mock data simulating content from the admin dashboard
  const mockBlocks = [
    {
      id: 'block-1',
      type: 'heading',
      content: {
        text: 'Spectra Blocks Integration Demo',
        level: 1
      }
    },
    {
      id: 'block-2',
      type: 'paragraph',
      content: {
        text: 'This page demonstrates the integration of Spectra blocks from the admin dashboard to the frontend. All blocks below are rendered using the same components that would display content created in the Gutenberg editor.'
      }
    },
    {
      id: 'block-3',
      type: 'spacer',
      content: {
        height: 40
      }
    },
    {
      id: 'block-4',
      type: 'uagb/call-to-action',
      content: {
        title: 'Transform Your Business Today',
        description: 'Experience the power of our platform with a 30-day free trial. No credit card required.',
        buttonText: 'Start Free Trial',
        buttonUrl: '/signup',
        backgroundColor: '#3b82f6',
        textColor: 'white',
        buttonColor: 'white',
        alignment: 'center'
      }
    },
    {
      id: 'block-5',
      type: 'spacer',
      content: {
        height: 60
      }
    },
    {
      id: 'block-6',
      type: 'heading',
      content: {
        text: 'Choose Your Perfect Plan',
        level: 2
      }
    },
    {
      id: 'block-7',
      type: 'uagb/pricing-table',
      content: {
        plans: [
          {
            name: 'Starter',
            price: '₩9,900',
            period: '월',
            features: [
              '기본 기능 모두 포함',
              '5GB 저장공간',
              '이메일 지원',
              '기본 분석 도구'
            ],
            highlighted: false
          },
          {
            name: 'Professional',
            price: '₩29,900',
            period: '월',
            features: [
              '모든 Starter 기능 포함',
              '50GB 저장공간',
              '우선 지원',
              '고급 분석 도구',
              '커스텀 도메인'
            ],
            highlighted: true
          },
          {
            name: 'Enterprise',
            price: '₩99,900',
            period: '월',
            features: [
              '모든 Professional 기능 포함',
              '무제한 저장공간',
              '24/7 전담 지원',
              'API 액세스',
              '맞춤형 솔루션'
            ],
            highlighted: false
          }
        ]
      }
    },
    {
      id: 'block-8',
      type: 'spacer',
      content: {
        height: 60
      }
    },
    {
      id: 'block-9',
      type: 'heading',
      content: {
        text: 'What Our Customers Say',
        level: 2
      }
    },
    {
      id: 'block-10',
      type: 'uagb/testimonial',
      content: {
        quote: 'O4O Platform has revolutionized how we manage our online and offline business. The integration is seamless and the results have exceeded our expectations.',
        author: '김미영',
        position: 'CEO',
        company: '네이처 코리아',
        rating: 5
      }
    },
    {
      id: 'block-11',
      type: 'spacer',
      content: {
        height: 40
      }
    },
    {
      id: 'block-12',
      type: 'columns',
      content: {
        columns: [
          {
            blocks: [
              {
                id: 'info-1',
                type: 'uagb/info-box',
                content: {
                  icon: 'mail',
                  title: 'Email Support',
                  description: 'Get help via email within 24 hours',
                  iconColor: '#3b82f6',
                  iconBackground: '#dbeafe',
                  alignment: 'center'
                }
              }
            ]
          },
          {
            blocks: [
              {
                id: 'info-2',
                type: 'uagb/info-box',
                content: {
                  icon: 'phone',
                  title: 'Phone Support',
                  description: 'Call us Monday to Friday, 9 AM - 6 PM',
                  iconColor: '#10b981',
                  iconBackground: '#d1fae5',
                  alignment: 'center'
                }
              }
            ]
          },
          {
            blocks: [
              {
                id: 'info-3',
                type: 'uagb/info-box',
                content: {
                  icon: 'messageSquare',
                  title: 'Live Chat',
                  description: 'Chat with our team in real-time',
                  iconColor: '#8b5cf6',
                  iconBackground: '#ede9fe',
                  alignment: 'center'
                }
              }
            ]
          }
        ]
      }
    },
    {
      id: 'block-13',
      type: 'spacer',
      content: {
        height: 40
      }
    },
    {
      id: 'block-14',
      type: 'paragraph',
      content: {
        text: 'This demo shows how Spectra blocks created in the admin dashboard are rendered on the frontend. The integration supports all block settings including colors, alignment, and content.'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <TemplateRenderer blocks={mockBlocks} className="max-w-6xl mx-auto" />
      </div>
    </div>
  );
};

export default SpectraBlocksDemo;