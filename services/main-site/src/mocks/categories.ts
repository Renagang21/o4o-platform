import { CategoryGroup, Category } from '../types/product';

// 카테고리 그룹 Mock 데이터
export const mockCategoryGroups: CategoryGroup[] = [
  {
    id: '1',
    name: '마케팅 카테고리',
    description: '마케팅 목적의 상품 분류',
    isActive: true,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '용도별 카테고리',
    description: '사용 용도에 따른 상품 분류',
    isActive: true,
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// 카테고리 Mock 데이터
export const mockCategories: Category[] = [
  // 마케팅 카테고리
  {
    id: '1',
    groupId: '1',
    name: '신상품',
    slug: 'new-products',
    level: 1,
    sortOrder: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    groupId: '1',
    name: '인기상품',
    slug: 'popular-products',
    level: 1,
    sortOrder: 2,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    groupId: '1',
    name: '베스트셀러',
    slug: 'bestsellers',
    level: 1,
    sortOrder: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  
  // 용도별 카테고리
  {
    id: '4',
    groupId: '2',
    name: '전자제품',
    slug: 'electronics',
    level: 1,
    sortOrder: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    children: [
      {
        id: '5',
        groupId: '2',
        parentId: '4',
        name: '스마트폰',
        slug: 'smartphones',
        level: 2,
        sortOrder: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '6',
        groupId: '2',
        parentId: '4',
        name: '노트북',
        slug: 'laptops',
        level: 2,
        sortOrder: 2,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '7',
        groupId: '2',
        parentId: '4',
        name: '태블릿',
        slug: 'tablets',
        level: 2,
        sortOrder: 3,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    id: '8',
    groupId: '2',
    name: '생활용품',
    slug: 'home-living',
    level: 1,
    sortOrder: 2,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    children: [
      {
        id: '9',
        groupId: '2',
        parentId: '8',
        name: '주방용품',
        slug: 'kitchen',
        level: 2,
        sortOrder: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '10',
        groupId: '2',
        parentId: '8',
        name: '욕실용품',
        slug: 'bathroom',
        level: 2,
        sortOrder: 2,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    id: '11',
    groupId: '2',
    name: '패션',
    slug: 'fashion',
    level: 1,
    sortOrder: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    children: [
      {
        id: '12',
        groupId: '2',
        parentId: '11',
        name: '남성의류',
        slug: 'mens-clothing',
        level: 2,
        sortOrder: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '13',
        groupId: '2',
        parentId: '11',
        name: '여성의류',
        slug: 'womens-clothing',
        level: 2,
        sortOrder: 2,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
];

// 평면화된 카테고리 목록 (검색 및 필터링용)
export const flatCategories = mockCategories.reduce((acc: Category[], category) => {
  acc.push(category);
  if (category.children) {
    acc.push(...category.children);
  }
  return acc;
}, []);