/**
 * SupplierProductsListPage - 공급자 제품 관리 (테이블 뷰)
 *
 * Work Order: WO-O4O-SUPPLIER-PRODUCTS-PAGE-V1
 *
 * 구성:
 * - Toolbar: 검색 + 카테고리 필터 + 상태 필터 + 제품 등록 버튼
 * - Table: 제품명 / 카테고리 / 등록일 / 상태 / 관리
 * - Empty State: 등록된 제품이 없습니다
 *
 * 데이터: supplierApi.getProducts()
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, Pen, FileCheck } from 'lucide-react';
import { supplierApi, type SupplierProduct } from '../../lib/api';

// ============================================================================
// Toolbar
// ============================================================================

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  status: string;
  onStatusChange: (v: string) => void;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearchChange, category, onCategoryChange, categories, status, onStatusChange } = props;

  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarFilters}>
        {/* Search */}
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="제품 검색..."
            style={styles.searchInput}
          />
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">카테고리 전체</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">상태 전체</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Link to="/account/supplier/products/new" style={styles.addButton}>
        <Plus size={16} />
        제품 등록
      </Link>
    </div>
  );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        ...styles.statusBadge,
        backgroundColor: isActive ? '#dcfce7' : '#f1f5f9',
        color: isActive ? '#15803d' : '#64748b',
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ============================================================================
// Product Table (Desktop)
// ============================================================================

function ProductTable({ products }: { products: SupplierProduct[] }) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>제품</th>
            <th style={styles.th}>카테고리</th>
            <th style={styles.th}>등록일</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} style={styles.tr}>
              <td style={styles.td}>
                <div style={styles.productNameCell}>
                  <div style={styles.productIconSmall}>
                    <Package size={14} style={{ color: '#64748b' }} />
                  </div>
                  <span style={styles.productNameText}>{product.name}</span>
                </div>
              </td>
              <td style={styles.td}>
                <span style={styles.categoryText}>{product.category || '-'}</span>
              </td>
              <td style={styles.td}>
                <span style={styles.dateText}>
                  {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <StatusBadge isActive={product.isActive} />
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <div style={styles.actionButtons}>
                  <Link to="/supplier/products" style={styles.actionLink}>
                    <Pen size={13} />
                    Edit
                  </Link>
                  <Link to="/supplier/offers" style={styles.actionLink}>
                    <FileCheck size={13} />
                    Offers
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Product Cards (Mobile)
// ============================================================================

function ProductCards({ products }: { products: SupplierProduct[] }) {
  return (
    <div style={styles.cardList}>
      {products.map((product) => (
        <div key={product.id} style={styles.mobileCard}>
          <div style={styles.mobileCardHeader}>
            <span style={styles.mobileProductName}>{product.name}</span>
            <StatusBadge isActive={product.isActive} />
          </div>
          <p style={styles.mobileCategory}>{product.category || '-'}</p>
          <div style={styles.mobileCardFooter}>
            <span style={styles.mobileDate}>
              {new Date(product.createdAt).toLocaleDateString('ko-KR')}
            </span>
            <Link to="/supplier/products" style={styles.actionLink}>
              <Pen size={13} />
              Edit
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <Package size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
      <p style={styles.emptyText}>등록된 제품이 없습니다.</p>
      <Link to="/account/supplier/products/new" style={styles.emptyButton}>
        <Plus size={16} />
        제품 등록
      </Link>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierProductsListPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await supplierApi.getProducts();
        setProducts(data);
      } catch {
        // non-critical
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (status === 'active' && !p.isActive) return false;
      if (status === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [products, search, category, status]);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Products</h1>
        <p style={styles.subtitle}>제품을 등록하고 관리합니다.</p>
      </div>

      {/* Toolbar */}
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        status={status}
        onStatusChange={setStatus}
      />

      {/* Content */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : filtered.length === 0 && products.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div style={styles.noResults}>
          <p style={styles.noResultsText}>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <ProductTable products={filtered} />
          </div>
          {/* Mobile Cards */}
          <div className="block md:hidden">
            <ProductCards products={filtered} />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  toolbarFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 200px',
    maxWidth: '280px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 32px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#334155',
    boxSizing: 'border-box',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },

  // Table
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tr: {
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  },
  productNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  productIconSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productNameText: {
    fontWeight: 500,
    color: '#1e293b',
  },
  categoryText: {
    fontSize: '13px',
    color: '#64748b',
  },
  dateText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  actionLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
    borderRadius: '4px',
    backgroundColor: '#eff6ff',
  },

  // Mobile Cards
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  mobileProductName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
  },
  mobileCategory: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  mobileCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },

  // States
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  emptyButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  noResultsText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
};
