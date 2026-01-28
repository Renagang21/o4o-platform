/**
 * PharmacyB2BProducts - B2B 상품 리스트 (WordPress WooCommerce Admin 스타일)
 *
 * 약국 경영 → B2B 구매 상품 목록.
 * WordPress WooCommerce 상품 관리 화면 패턴을 충실히 모방:
 * - 화면 옵션 (컬럼 토글, 페이지당 항목 수)
 * - 상태 필터 탭 (모두 | 발행됨 | 임시글 | 대기중)
 * - 필터 바 (일괄 작업, 카테고리, 재고, 브랜드)
 * - 정렬 가능한 컬럼 헤더 (클릭 → ASC/DESC)
 * - 호버 액션 (편집 | 빠른 편집 | 휴지통 | 미리보기 | 복사)
 * - 이미지 썸네일, SKU, 재고, 가격, 카테고리, 태그, 브랜드, 공급자, 추천, 날짜
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  Star,
  ImageIcon,
} from 'lucide-react';

// ─── 타입 ───────────────────────────────────────────────

interface B2BProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
  stock: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  price: number;
  salePrice: number | null;
  category: string;
  tags: string[];
  brand: string;
  supplier: string;
  status: 'published' | 'draft' | 'pending';
  featured: boolean;
  createdAt: string;
}

type SortKey = 'name' | 'sku' | 'stock' | 'price' | 'category' | 'brand' | 'supplier' | 'date';
type SortDir = 'asc' | 'desc';

// ─── 목 데이터 ──────────────────────────────────────────

const MOCK_PRODUCTS: B2BProduct[] = [
  {
    id: '1', name: '[맛있다고 소문난 저당간식 패키지] 저당 간식 – 혈당커트,저당양갱,안심바,바삭칩(두가지맛) 한정수량 50세트',
    sku: 'KDA-PKG-001', image: '', stock: 76, stockStatus: 'in_stock',
    price: 90900, salePrice: 50000, category: '건강식품', tags: ['당플랜', '바삭칩', '안심바', '저당양갱', '혈당커트'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'draft', featured: false, createdAt: '2026-01-10',
  },
  {
    id: '2', name: '[오늘의 나를 돌보는 선택] 시칠리아산 유기농 레몬즙+바나듐뽕잎+워시드클렌징비누 한정수량 20세트',
    sku: 'KDA-PKG-002', image: '', stock: 29, stockStatus: 'in_stock',
    price: 53800, salePrice: 30000, category: '건강식품', tags: ['바나듐뽕잎', '시칠리아산', '워시드클렌징비누', '유기농레몬즙'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'draft', featured: false, createdAt: '2026-01-09',
  },
  {
    id: '3', name: '[우리집 건강관리 세트]휴비딕 혈압계+콘드로이친 더블액션 세트',
    sku: 'KDA-PKG-003', image: '', stock: 0, stockStatus: 'out_of_stock',
    price: 90140, salePrice: 30000, category: '의료기기', tags: ['더블액션', '블루랄찌', '비피책', '혈당꿀찌', '휴비딕', '콘드로이친'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'draft', featured: false, createdAt: '2026-01-08',
  },
  {
    id: '4', name: '[일양약품] 더블액션 상어연골 콘드로이친x2박스',
    sku: 'IY-SHARK-001', image: '', stock: 20, stockStatus: 'in_stock',
    price: 40000, salePrice: 17000, category: '건강기능식품', tags: ['더블액션', '상어연골', '일양약품', '콘드로이친'],
    brand: '일양약품', supplier: '(사)한국당뇨협회', status: 'draft', featured: false, createdAt: '2026-01-07',
  },
  {
    id: '5', name: 'FreeStyle Libre 3 센서 (14일)',
    sku: 'ABT-FSL3-001', image: '', stock: 150, stockStatus: 'in_stock',
    price: 70000, salePrice: null, category: 'CGM', tags: ['CGM', 'FreeStyle', 'Libre3', '연속혈당'],
    brand: 'Abbott', supplier: 'Abbott Korea', status: 'published', featured: true, createdAt: '2026-01-15',
  },
  {
    id: '6', name: 'Dexcom G7 센서팩 (10일)',
    sku: 'DEX-G7-001', image: '', stock: 85, stockStatus: 'in_stock',
    price: 65000, salePrice: null, category: 'CGM', tags: ['CGM', 'Dexcom', 'G7'],
    brand: 'Dexcom', supplier: 'Dexcom Korea', status: 'published', featured: true, createdAt: '2026-01-14',
  },
  {
    id: '7', name: '아큐첵 가이드 혈당측정기 세트',
    sku: 'RC-GUIDE-001', image: '', stock: 200, stockStatus: 'in_stock',
    price: 35000, salePrice: 28000, category: '혈당측정기', tags: ['아큐첵', '혈당측정기'],
    brand: 'Roche', supplier: 'Roche Diabetes Care', status: 'published', featured: false, createdAt: '2026-01-12',
  },
  {
    id: '8', name: '아큐첵 가이드 시험지 50매',
    sku: 'RC-STRIP-050', image: '', stock: 500, stockStatus: 'in_stock',
    price: 22000, salePrice: null, category: '시험지', tags: ['아큐첵', '시험지'],
    brand: 'Roche', supplier: 'Roche Diabetes Care', status: 'published', featured: false, createdAt: '2026-01-12',
  },
  {
    id: '9', name: '소프트클릭스 란셋 200개입',
    sku: 'RC-LAN-200', image: '', stock: 300, stockStatus: 'in_stock',
    price: 15000, salePrice: null, category: '란셋', tags: ['란셋', '소프트클릭스'],
    brand: 'Roche', supplier: 'Roche Diabetes Care', status: 'published', featured: false, createdAt: '2026-01-11',
  },
  {
    id: '10', name: '노보 노르디스크 노보펜 6',
    sku: 'NN-PEN6-001', image: '', stock: 45, stockStatus: 'in_stock',
    price: 120000, salePrice: null, category: '인슐린 펜', tags: ['노보펜', '인슐린'],
    brand: 'Novo Nordisk', supplier: 'Novo Nordisk Korea', status: 'published', featured: true, createdAt: '2026-01-10',
  },
  {
    id: '11', name: '혈당 관리 종합 건강기능식품 (바나듐 뽕잎 추출물)',
    sku: 'HF-BAN-001', image: '', stock: 60, stockStatus: 'in_stock',
    price: 45000, salePrice: 35000, category: '건강기능식품', tags: ['바나듐', '뽕잎', '혈당관리'],
    brand: '헬스팜', supplier: '헬스팜', status: 'published', featured: false, createdAt: '2026-01-09',
  },
  {
    id: '12', name: '크롬 피콜리네이트 60정',
    sku: 'HF-CRM-060', image: '', stock: 120, stockStatus: 'in_stock',
    price: 25000, salePrice: null, category: '건강기능식품', tags: ['크롬', '피콜리네이트'],
    brand: '헬스팜', supplier: '헬스팜', status: 'published', featured: false, createdAt: '2026-01-08',
  },
  {
    id: '13', name: 'OneTouch Verio Reflect 혈당측정기',
    sku: 'JNJ-VR-001', image: '', stock: 0, stockStatus: 'out_of_stock',
    price: 42000, salePrice: null, category: '혈당측정기', tags: ['OneTouch', '혈당측정기'],
    brand: 'LifeScan', supplier: 'Johnson & Johnson', status: 'published', featured: false, createdAt: '2026-01-07',
  },
  {
    id: '14', name: '프리스타일 옵티엄 네오 H 혈당측정기',
    sku: 'ABT-OPT-001', image: '', stock: 3, stockStatus: 'low_stock',
    price: 38000, salePrice: null, category: '혈당측정기', tags: ['프리스타일', '옵티엄'],
    brand: 'Abbott', supplier: 'Abbott Korea', status: 'published', featured: false, createdAt: '2026-01-06',
  },
  {
    id: '15', name: '저당 양갱 (5종 세트)',
    sku: 'KDA-YG-005', image: '', stock: 40, stockStatus: 'in_stock',
    price: 18000, salePrice: 15000, category: '건강식품', tags: ['저당', '양갱'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'published', featured: false, createdAt: '2026-01-05',
  },
  {
    id: '16', name: '혈당 안심바 (10개입)',
    sku: 'KDA-BAR-010', image: '', stock: 55, stockStatus: 'in_stock',
    price: 22000, salePrice: 18000, category: '건강식품', tags: ['안심바', '저당'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'published', featured: false, createdAt: '2026-01-04',
  },
  {
    id: '17', name: '인슐린 보관 파우치 (냉장형)',
    sku: 'MD-POUCH-001', image: '', stock: 80, stockStatus: 'in_stock',
    price: 28000, salePrice: null, category: '의료용품', tags: ['인슐린', '보관파우치'],
    brand: 'MediCool', supplier: 'MediCool Korea', status: 'published', featured: false, createdAt: '2026-01-03',
  },
  {
    id: '18', name: 'CGM 센서 부착 테이프 (30매)',
    sku: 'MD-TAPE-030', image: '', stock: 200, stockStatus: 'in_stock',
    price: 12000, salePrice: null, category: '의료용품', tags: ['CGM', '테이프'],
    brand: 'MediCool', supplier: 'MediCool Korea', status: 'pending', featured: false, createdAt: '2026-01-02',
  },
  {
    id: '19', name: '오메가3 고함량 EPA/DHA (60캡슐)',
    sku: 'HF-OMG-060', image: '', stock: 90, stockStatus: 'in_stock',
    price: 32000, salePrice: 26000, category: '건강기능식품', tags: ['오메가3', 'EPA', 'DHA'],
    brand: '헬스팜', supplier: '헬스팜', status: 'published', featured: false, createdAt: '2026-01-01',
  },
  {
    id: '20', name: '케어센스 N Premier 혈당측정기',
    sku: 'IS-CSN-001', image: '', stock: 15, stockStatus: 'low_stock',
    price: 30000, salePrice: null, category: '혈당측정기', tags: ['케어센스', '혈당측정기'],
    brand: 'i-SENS', supplier: 'i-SENS', status: 'published', featured: false, createdAt: '2025-12-28',
  },
  {
    id: '21', name: '혈당커트 30포 (식후 혈당 관리)',
    sku: 'KDA-CUT-030', image: '', stock: 35, stockStatus: 'in_stock',
    price: 35000, salePrice: 28000, category: '건강기능식품', tags: ['혈당커트', '식후혈당'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'published', featured: true, createdAt: '2025-12-27',
  },
  {
    id: '22', name: '시칠리아산 유기농 레몬즙 500ml',
    sku: 'KDA-LEM-500', image: '', stock: 25, stockStatus: 'in_stock',
    price: 18000, salePrice: null, category: '건강식품', tags: ['레몬즙', '유기농'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'published', featured: false, createdAt: '2025-12-26',
  },
  {
    id: '23', name: '글루코스 바이탈 프로바이오틱스 30캡슐',
    sku: 'HF-PRO-030', image: '', stock: 70, stockStatus: 'in_stock',
    price: 28000, salePrice: 22000, category: '건강기능식품', tags: ['프로바이오틱스', '장건강'],
    brand: '헬스팜', supplier: '헬스팜', status: 'draft', featured: false, createdAt: '2025-12-25',
  },
  {
    id: '24', name: 'BD 인슐린 주사바늘 31G 5mm (100개입)',
    sku: 'BD-NDL-100', image: '', stock: 400, stockStatus: 'in_stock',
    price: 20000, salePrice: null, category: '의료용품', tags: ['BD', '주사바늘', '인슐린'],
    brand: 'BD', supplier: 'BD Korea', status: 'published', featured: false, createdAt: '2025-12-24',
  },
  {
    id: '25', name: '바삭칩 저당 스낵 (두가지맛) 20봉',
    sku: 'KDA-CHP-020', image: '', stock: 18, stockStatus: 'low_stock',
    price: 24000, salePrice: 20000, category: '건강식품', tags: ['바삭칩', '저당'],
    brand: '한국당뇨협회', supplier: '(사)한국당뇨협회', status: 'published', featured: false, createdAt: '2025-12-23',
  },
];

// ─── 상수 ───────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  sortKey?: SortKey;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'image', label: '이미지', defaultVisible: true },
  { key: 'sku', label: 'SKU', sortKey: 'sku', defaultVisible: true },
  { key: 'stock', label: '재고', sortKey: 'stock', defaultVisible: true },
  { key: 'price', label: '가격', sortKey: 'price', defaultVisible: true },
  { key: 'category', label: '카테고리', sortKey: 'category', defaultVisible: true },
  { key: 'tags', label: '태그', defaultVisible: true },
  { key: 'brand', label: '브랜드', sortKey: 'brand', defaultVisible: true },
  { key: 'featured', label: '추천', defaultVisible: true },
  { key: 'date', label: '날짜', sortKey: 'date', defaultVisible: true },
  { key: 'supplier', label: '공급자', sortKey: 'supplier', defaultVisible: true },
];

const STATUS_LABELS: Record<string, string> = {
  all: '모두',
  published: '발행됨',
  draft: '임시글',
  pending: '대기중',
};

const CATEGORY_OPTIONS = [
  '전체', 'CGM', '혈당측정기', '시험지', '란셋', '인슐린 펜',
  '건강기능식품', '건강식품', '의료기기', '의료용품',
];

const STOCK_OPTIONS = ['전체', '재고 있음', '재고 없음', '재고 부족'];
const BRAND_OPTIONS = ['전체', 'Abbott', 'Dexcom', 'Roche', 'Novo Nordisk', 'LifeScan', 'i-SENS', 'BD', 'MediCool', '헬스팜', '한국당뇨협회', '일양약품'];

// ─── 정렬 헬퍼 ──────────────────────────────────────────

function getSortValue(product: B2BProduct, key: SortKey): string | number {
  switch (key) {
    case 'name': return product.name;
    case 'sku': return product.sku;
    case 'stock': return product.stock;
    case 'price': return product.salePrice ?? product.price;
    case 'category': return product.category;
    case 'brand': return product.brand;
    case 'supplier': return product.supplier;
    case 'date': return product.createdAt;
    default: return '';
  }
}

function sortProducts(products: B2BProduct[], sortKey: SortKey | null, sortDir: SortDir): B2BProduct[] {
  if (!sortKey) return products;
  return [...products].sort((a, b) => {
    const va = getSortValue(a, sortKey);
    const vb = getSortValue(b, sortKey);
    if (typeof va === 'number' && typeof vb === 'number') {
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

// ─── 가격 포맷 ──────────────────────────────────────────

function formatPrice(n: number) {
  return '₩' + n.toLocaleString();
}

// ─── 메인 컴포넌트 ──────────────────────────────────────

export default function PharmacyB2BProducts() {
  const navigate = useNavigate();

  // 화면 옵션
  const [screenOptionsOpen, setScreenOptionsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // 필터
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [stockFilter, setStockFilter] = useState('전체');
  const [brandFilter, setBrandFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);

  // 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── 파생 데이터 ────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let list = MOCK_PRODUCTS;

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (categoryFilter !== '전체') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (stockFilter !== '전체') {
      if (stockFilter === '재고 있음') list = list.filter((p) => p.stockStatus === 'in_stock');
      else if (stockFilter === '재고 없음') list = list.filter((p) => p.stockStatus === 'out_of_stock');
      else if (stockFilter === '재고 부족') list = list.filter((p) => p.stockStatus === 'low_stock');
    }
    if (brandFilter !== '전체') {
      list = list.filter((p) => p.brand === brandFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q)
      );
    }

    // 정렬 적용
    list = sortProducts(list, sortKey, sortDir);

    return list;
  }, [statusFilter, categoryFilter, stockFilter, brandFilter, searchQuery, sortKey, sortDir]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MOCK_PRODUCTS.length, published: 0, draft: 0, pending: 0 };
    for (const p of MOCK_PRODUCTS) counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── 핸들러 ─────────────────────────────────────────

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
    setCurrentPage(1);
  }, []);

  function isColVisible(key: string) {
    return visibleColumns.has(key);
  }

  // ─── 정렬 아이콘 ───────────────────────────────────

  function SortIndicator({ columnKey }: { columnKey: SortKey }) {
    const isActive = sortKey === columnKey;
    return (
      <span className={`inline-flex flex-col ml-1 leading-none ${isActive ? 'text-slate-700' : 'text-slate-300'}`}>
        <span className={`text-[8px] leading-[8px] ${isActive && sortDir === 'asc' ? 'text-slate-700' : ''}`}>▲</span>
        <span className={`text-[8px] leading-[8px] ${isActive && sortDir === 'desc' ? 'text-slate-700' : ''}`}>▼</span>
      </span>
    );
  }

  // ─── 정렬 가능 헤더 ─────────────────────────────────

  function SortableHeader({ label, sortable, align }: { label: string; sortable?: SortKey; align?: 'left' | 'right' | 'center' }) {
    const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    if (!sortable) {
      return <span className={`text-xs font-semibold text-slate-600 uppercase tracking-wide ${textAlign}`}>{label}</span>;
    }

    return (
      <button
        onClick={() => handleSort(sortable)}
        className={`flex items-center gap-0.5 text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900 transition-colors ${justifyClass} w-full`}
      >
        {label}
        <SortIndicator columnKey={sortable} />
      </button>
    );
  }

  // ─── 렌더링 ─────────────────────────────────────────

  return (
    <div className="max-w-full">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pharmacy/management')}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            ← 약국 경영
          </button>
          <h1 className="text-xl font-bold text-slate-900">상품</h1>
          <span className="text-sm text-slate-400">({MOCK_PRODUCTS.length})</span>
        </div>

        {/* 화면 옵션 토글 */}
        <button
          onClick={() => setScreenOptionsOpen(!screenOptionsOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          화면 옵션 {screenOptionsOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* ─── 화면 옵션 패널 ─────────────────────────── */}
      {screenOptionsOpen && (
        <div className="bg-[#f1f1f1] border border-slate-300 rounded p-4 mb-3 shadow-sm">
          {/* 컬럼 토글 */}
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">컬럼</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* 페이지당 항목 수 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">페이지당 항목 수:</span>
            <input
              type="number"
              min={5}
              max={100}
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Math.max(5, Math.min(100, Number(e.target.value) || 20)))}
              className="w-14 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      )}

      {/* ─── 상태 탭 + 검색 ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-t-lg">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          {/* 상태 탭 — WordPress 스타일 */}
          <ul className="flex items-center gap-0 text-[13px]">
            {Object.entries(STATUS_LABELS).map(([key, label], idx) => (
              <li key={key} className="flex items-center">
                {idx > 0 && <span className="text-slate-300 mx-1">|</span>}
                <button
                  onClick={() => { setStatusFilter(key); setCurrentPage(1); }}
                  className={`hover:text-primary-700 ${
                    statusFilter === key
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                  {' '}
                  <span className="text-slate-400">({statusCounts[key] || 0})</span>
                </button>
              </li>
            ))}
          </ul>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="상품 검색..."
              className="pl-7 pr-3 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
            />
          </div>
        </div>

        {/* ─── 필터 바 (WordPress tablenav top) ────── */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 bg-[#fafafa]">
          {/* 일괄 작업 */}
          <select className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option>일괄 작업</option>
            <option>장바구니에 추가</option>
          </select>
          <button className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium text-slate-600">
            적용
          </button>

          <span className="text-slate-300">|</span>

          {/* 카테고리 필터 */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c === '전체' ? '카테고리 선택' : c}</option>
            ))}
          </select>

          {/* 재고 상태 필터 */}
          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {STOCK_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === '전체' ? '재고 상태별 필터링' : s}</option>
            ))}
          </select>

          {/* 브랜드 필터 */}
          <select
            value={brandFilter}
            onChange={(e) => { setBrandFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {BRAND_OPTIONS.map((b) => (
              <option key={b} value={b}>{b === '전체' ? '브랜드로 필터링' : b}</option>
            ))}
          </select>

          <button
            onClick={() => { setCategoryFilter('전체'); setStockFilter('전체'); setBrandFilter('전체'); setSearchQuery(''); setCurrentPage(1); }}
            className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium text-slate-600"
          >
            필터
          </button>

          {/* 우측: 아이템 수 + 페이지네이션 */}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>{filteredProducts.length}개 아이템</span>
            <PaginationCompact
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* ─── 테이블 ──────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#f9f9f9]">
                {/* 체크박스 */}
                <th className="w-[2.5%] px-2 py-2">
                  <input
                    type="checkbox"
                    checked={paginatedProducts.length > 0 && selectedIds.size === paginatedProducts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-primary-600 w-3.5 h-3.5"
                  />
                </th>
                {/* 이미지 (썸네일) */}
                {isColVisible('image') && (
                  <th className="w-[52px] px-1 py-2">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  </th>
                )}
                {/* 이름 — 항상 표시, 정렬 가능 */}
                <th className="px-2 py-2 text-left">
                  <SortableHeader label="이름" sortable="name" />
                </th>
                {isColVisible('sku') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="SKU" sortable="sku" />
                  </th>
                )}
                {isColVisible('stock') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="재고" sortable="stock" />
                  </th>
                )}
                {isColVisible('price') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="가격" sortable="price" />
                  </th>
                )}
                {isColVisible('category') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="카테고리" sortable="category" />
                  </th>
                )}
                {isColVisible('tags') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="태그" />
                  </th>
                )}
                {isColVisible('brand') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="브랜드" sortable="brand" />
                  </th>
                )}
                {isColVisible('featured') && (
                  <th className="w-[40px] px-1 py-2 text-center">
                    <Star className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  </th>
                )}
                {isColVisible('date') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="날짜" sortable="date" />
                  </th>
                )}
                {isColVisible('supplier') && (
                  <th className="px-2 py-2 text-left">
                    <SortableHeader label="공급자" sortable="supplier" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)).length}
                    className="px-4 py-10 text-center text-slate-400 text-sm"
                  >
                    조건에 맞는 상품이 없습니다
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, idx) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selected={selectedIds.has(product.id)}
                    onToggle={() => toggleSelect(product.id)}
                    visibleColumns={visibleColumns}
                    isAlt={idx % 2 === 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 하단 tablenav (WordPress bottom bar) ── */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-200 bg-[#fafafa]">
          <select className="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
            <option>일괄 작업</option>
            <option>장바구니에 추가</option>
          </select>
          <button className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium text-slate-600">
            적용
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>
              {filteredProducts.length}개 중 {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)}개
            </span>
            <PaginationCompact
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 상품 행 (WordPress WooCommerce 스타일) ─────────────

function ProductRow({
  product,
  selected,
  onToggle,
  visibleColumns,
  isAlt,
}: {
  product: B2BProduct;
  selected: boolean;
  onToggle: () => void;
  visibleColumns: Set<string>;
  isAlt: boolean;
}) {
  const vis = (key: string) => visibleColumns.has(key);

  // 재고 표시 (WordPress 스타일: "재고 있음 (76)")
  const stockDisplay = (() => {
    if (product.stockStatus === 'out_of_stock') return { text: '품절', cls: 'text-red-600 font-semibold' };
    if (product.stockStatus === 'low_stock') return { text: `재고 부족 (${product.stock})`, cls: 'text-amber-600 font-medium' };
    return { text: `재고 있음 (${product.stock})`, cls: 'text-emerald-700' };
  })();

  // 상태 접미사 (WordPress: "— 임시글", "— 대기중")
  const statusSuffix =
    product.status === 'draft'
      ? ' — 임시글'
      : product.status === 'pending'
        ? ' — 대기중'
        : '';

  const bgClass = isAlt ? 'bg-[#f9f9f9]' : 'bg-white';

  return (
    <tr className={`border-b border-slate-100 ${bgClass} hover:bg-[#f0f6fc] transition-colors group`}>
      {/* 체크박스 */}
      <td className="px-2 py-1.5 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded border-slate-300 text-primary-600 w-3.5 h-3.5 mt-1"
        />
      </td>

      {/* 이미지 (썸네일 — 40x40) */}
      {vis('image') && (
        <td className="px-1 py-1.5 align-top">
          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 overflow-hidden flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </div>
        </td>
      )}

      {/* 이름 (WordPress: 상품명 링크 + 상태 + 호버 액션) */}
      <td className="px-2 py-1.5 align-top">
        <div>
          <a href="#" className="text-[13px] text-primary-700 hover:text-primary-900 hover:underline font-semibold leading-tight">
            {product.name}
          </a>
          {statusSuffix && (
            <span className="text-slate-400 text-xs font-normal">{statusSuffix}</span>
          )}
          {/* WordPress 호버 액션 행 */}
          <div className="hidden group-hover:block mt-0.5 text-[11px] leading-relaxed">
            <span className="text-slate-500">ID: {product.id}</span>
            <span className="text-slate-300 mx-1">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800 hover:underline">편집</a>
            <span className="text-slate-300 mx-1">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800 hover:underline">빠른 편집</a>
            <span className="text-slate-300 mx-1">|</span>
            <a href="#" className="text-red-600 hover:text-red-800 hover:underline">휴지통</a>
            <span className="text-slate-300 mx-1">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800 hover:underline">미리보기</a>
            <span className="text-slate-300 mx-1">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800 hover:underline">복사</a>
          </div>
        </div>
      </td>

      {/* SKU */}
      {vis('sku') && (
        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap align-top text-[13px]">{product.sku}</td>
      )}

      {/* 재고 */}
      {vis('stock') && (
        <td className={`px-2 py-1.5 whitespace-nowrap align-top text-[12px] ${stockDisplay.cls}`}>
          {stockDisplay.text}
        </td>
      )}

      {/* 가격 (WordPress: 정가 취소선 + 할인가) */}
      {vis('price') && (
        <td className="px-2 py-1.5 whitespace-nowrap align-top text-[13px]">
          {product.salePrice ? (
            <>
              <del className="text-slate-400">{formatPrice(product.price)}</del>
              <br />
              <ins className="no-underline text-slate-900 font-medium">{formatPrice(product.salePrice)}</ins>
            </>
          ) : (
            <span className="text-slate-900">{formatPrice(product.price)}</span>
          )}
        </td>
      )}

      {/* 카테고리 */}
      {vis('category') && (
        <td className="px-2 py-1.5 align-top">
          <a href="#" className="text-[13px] text-primary-600 hover:text-primary-800 hover:underline">{product.category}</a>
        </td>
      )}

      {/* 태그 (WordPress: 콤마 구분 링크) */}
      {vis('tags') && (
        <td className="px-2 py-1.5 align-top">
          <div className="max-w-[180px] text-[12px] leading-relaxed">
            {product.tags.map((tag, i) => (
              <span key={tag}>
                {i > 0 && <span className="text-slate-300">, </span>}
                <a href="#" className="text-primary-600 hover:text-primary-800 hover:underline">{tag}</a>
              </span>
            ))}
          </div>
        </td>
      )}

      {/* 브랜드 */}
      {vis('brand') && (
        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap align-top text-[13px]">{product.brand}</td>
      )}

      {/* 추천 (WordPress: 별표 토글) */}
      {vis('featured') && (
        <td className="px-1 py-1.5 text-center align-top">
          <button className="hover:opacity-80 transition-opacity">
            <Star
              className={`w-4 h-4 ${product.featured ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-slate-400'}`}
            />
          </button>
        </td>
      )}

      {/* 날짜 */}
      {vis('date') && (
        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap align-top text-[12px]">
          {product.status === 'published' ? '발행됨' : product.status === 'draft' ? '최종 수정일' : '대기중'}
          <br />
          <span className="text-slate-400">{product.createdAt}</span>
        </td>
      )}

      {/* 공급자 */}
      {vis('supplier') && (
        <td className="px-2 py-1.5 align-top">
          <span className="text-[12px] text-slate-600">{product.supplier}</span>
        </td>
      )}
    </tr>
  );
}

// ─── 컴팩트 페이지네이션 (WordPress 스타일) ──────────────

function PaginationCompact({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage <= 1}
        className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default"
        title="처음 페이지"
      >
        <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default"
        title="이전 페이지"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
      </button>
      <span className="text-xs text-slate-600 px-1 tabular-nums">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default"
        title="다음 페이지"
      >
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage >= totalPages}
        className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-default"
        title="마지막 페이지"
      >
        <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
      </button>
    </div>
  );
}
