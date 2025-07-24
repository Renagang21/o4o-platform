import { http, HttpResponse } from 'msw';
import type { ACFFieldGroup, ACFRepeaterField, ACFGalleryField } from '@o4o/types';
import type { ACFGroupData } from '../types';

// Mock data
const mockFieldGroups: ACFFieldGroup[] = [
  {
    id: 'fg-1',
    name: '제품 상세 정보',
    key: 'product_details',
    description: '제품의 상세 정보를 관리하는 필드 그룹',
    position: 'normal',
    style: 'default',
    labelPlacement: 'top',
    instructionPlacement: 'label',
    active: true,
    showInRest: true,
    fields: [
      {
        id: 'field-1',
        name: '특징',
        key: 'features',
        type: 'repeater',
        label: '제품 특징',
        description: '제품의 주요 특징을 입력하세요',
        required: false,
        subFields: [
          {
            id: 'field-1-1',
            name: '아이콘',
            key: 'icon',
            type: 'image',
            label: '특징 아이콘',
            required: false,
          },
          {
            id: 'field-1-2',
            name: '제목',
            key: 'title',
            type: 'text',
            label: '특징 제목',
            required: true,
          },
          {
            id: 'field-1-3',
            name: '설명',
            key: 'description',
            type: 'textarea',
            label: '특징 설명',
            required: false,
          },
        ],
        minRows: 1,
        maxRows: 6,
        buttonLabel: '특징 추가',
      } as ACFRepeaterField,
      {
        id: 'field-2',
        name: '기술 사양',
        key: 'specifications',
        type: 'wysiwyg',
        label: '기술 사양',
        description: '제품의 기술적인 사양을 입력하세요',
        required: false,
        rows: 10,
      },
      {
        id: 'field-3',
        name: '갤러리',
        key: 'gallery',
        type: 'gallery',
        label: '제품 갤러리',
        description: '제품 이미지를 업로드하세요',
        required: false,
        minImages: 1,
        maxImages: 10,
      } as ACFGalleryField,
    ],
    location: [
      {
        rules: [
          {
            param: 'post_type',
            operator: '==',
            value: 'product',
          },
        ],
        operator: 'AND',
      },
    ],
    hideOnScreen: [],
    order: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'fg-2',
    name: '페이지 SEO',
    key: 'page_seo',
    description: '페이지 SEO 메타데이터 관리',
    position: 'side',
    style: 'seamless',
    labelPlacement: 'top',
    instructionPlacement: 'field',
    active: true,
    showInRest: true,
    fields: [
      {
        id: 'field-4',
        name: 'SEO 제목',
        key: 'seo_title',
        type: 'text',
        label: 'SEO 제목',
        description: '검색 결과에 표시될 제목 (60자 이내)',
        required: false,
        maxLength: 60,
        placeholder: '페이지 제목을 입력하세요',
      },
      {
        id: 'field-5',
        name: 'SEO 설명',
        key: 'seo_description',
        type: 'textarea',
        label: 'SEO 설명',
        description: '검색 결과에 표시될 설명 (160자 이내)',
        required: false,
        maxLength: 160,
        rows: 3,
      },
      {
        id: 'field-6',
        name: 'SEO 키워드',
        key: 'seo_keywords',
        type: 'text',
        label: 'SEO 키워드',
        description: '쉼표로 구분된 키워드',
        required: false,
      },
    ],
    location: [
      {
        rules: [
          {
            param: 'post_type',
            operator: '==',
            value: 'page',
          },
        ],
        operator: 'AND',
      },
    ],
    hideOnScreen: [],
    order: 1,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Store field groups in memory for CRUD operations
let fieldGroups = [...mockFieldGroups];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const acfHandlers = [
  // Get all field groups
  http.get(`${API_BASE}/v1/acf/field-groups`, () => {
    return HttpResponse.json(fieldGroups);
  }),

  // Get single field group
  http.get(`${API_BASE}/v1/acf/field-groups/:id`, ({ params }) => {
    const { id } = params as { id: string };
    const fieldGroup = fieldGroups.find(fg => fg.id === id);
    if (!fieldGroup) {
      return HttpResponse.json({ error: 'Field group not found' }, { status: 404 });
    }
    return HttpResponse.json(fieldGroup);
  }),

  // Create field group
  http.post(`${API_BASE}/v1/acf/field-groups`, async ({ request }) => {
    const data = await request.json() as ACFGroupData;
    const { title, fields, location, ...restData } = data;
    const newFieldGroup = {
      id: `fg-${Date.now()}`,
      name: title || 'New Field Group',
      key: `field_${Date.now()}`,
      order: 0,
      position: 'normal',
      fields: fields || [],
      location: location || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...restData,
    } as unknown as ACFFieldGroup;
    
    fieldGroups.push(newFieldGroup);
    return HttpResponse.json(newFieldGroup, { status: 201 });
  }),

  // Update field group
  http.put(`${API_BASE}/v1/acf/field-groups/:id`, async ({ params, request }) => {
    const data = await request.json() as Partial<ACFGroupData>;
    const { id } = params as { id: string };
    const index = fieldGroups.findIndex(fg => fg.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Field group not found' }, { status: 404 });
    }
    
    fieldGroups[index] = {
      ...fieldGroups[index],
      ...data,
      fields: data.fields || fieldGroups[index].fields,
      location: data.location || fieldGroups[index].location,
      updatedAt: new Date(),
    } as ACFFieldGroup;
    
    return HttpResponse.json(fieldGroups[index]);
  }),

  // Delete field group
  http.delete(`${API_BASE}/v1/acf/field-groups/:id`, ({ params }) => {
    const { id } = params as { id: string };
    const index = fieldGroups.findIndex(fg => fg.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Field group not found' }, { status: 404 });
    }
    
    fieldGroups.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Duplicate field group
  http.post(`${API_BASE}/v1/acf/field-groups/:id/duplicate`, ({ params }: any) => {
    const fieldGroup = fieldGroups.find(fg => fg.id === params.id);
    
    if (!fieldGroup) {
      return HttpResponse.json({ error: 'Field group not found' }, { status: 404 });
    }
    
    const duplicated: ACFFieldGroup = {
      ...fieldGroup,
      id: `fg-${Date.now()}`,
      name: `${fieldGroup.name} (복사본)`,
      key: `${fieldGroup.key}_copy`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    fieldGroups.push(duplicated);
    return HttpResponse.json(duplicated, { status: 201 });
  }),
];