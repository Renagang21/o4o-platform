import React, { useState, useEffect } from 'react';
import { Plus, Store, Mail, Phone, Key, Globe, CheckCircle, XCircle } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import SupplierForm from './SupplierForm';

interface Supplier {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  acf: {
    supplier_email?: string;
    supplier_phone?: string;
    supplier_business_number?: string;
    supplier_api_key?: string;
    supplier_api_endpoint?: string;
  };
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await dropshippingAPI.getSuppliers();
      if (response.success) {
        setSuppliers(response.data);
      }
    } catch (error) {
      
      toast.error('공급자 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 연결된 상품 정보에 영향을 줄 수 있습니다.')) return;

    try {
      const response = await dropshippingAPI.deleteSupplier(id);
      if (response.success) {
        toast.success('공급자가 삭제되었습니다');
        fetchSuppliers();
      }
    } catch (error) {
      
      toast.error('공급자 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelection.length === 0) {
      toast.error('삭제할 항목을 선택해주세요');
      return;
    }

    if (!confirm(`${bulkSelection.length}개 공급자를 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(bulkSelection.map(id => dropshippingAPI.deleteSupplier(id)));
      toast.success('선택한 공급자가 삭제되었습니다');
      setBulkSelection([]);
      fetchSuppliers();
    } catch (error) {
      
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedSupplier(null);
    fetchSuppliers();
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelection(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (bulkSelection.length === suppliers.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(suppliers.map(s => s.id));
    }
  };

  const getAPIStatus = (supplier: Supplier) => {
    const hasAPI = supplier.acf.supplier_api_key && supplier.acf.supplier_api_endpoint;
    
    if (hasAPI) {
      return (
        <span className="inline-flex items-center text-green-600">
          <CheckCircle className="h-4 w-4 mr-1" />
          <span className="text-sm">연동됨</span>
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center text-gray-400">
        <XCircle className="h-4 w-4 mr-1" />
        <span className="text-sm">미연동</span>
      </span>
    );
  };

  if (showForm) {
    return (
      <SupplierForm 
        supplier={selectedSupplier} 
        onClose={handleFormClose}
      />
    );
  }

  // Calculate statistics
  const stats = {
    total: suppliers.length,
    apiConnected: suppliers.filter(s => s.acf.supplier_api_key && s.acf.supplier_api_endpoint).length,
    noApi: suppliers.filter(s => !s.acf.supplier_api_key || !s.acf.supplier_api_endpoint).length,
    withBusinessNumber: suppliers.filter(s => s.acf.supplier_business_number).length
  };

  return (
    <div className="p-6">
      {/* WordPress Admin Style Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">공급자</h1>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition"
        >
          새로 추가
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 공급자</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Store className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">API 연동</p>
              <p className="text-2xl font-bold">{stats.apiConnected}</p>
            </div>
            <Globe className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">API 미연동</p>
              <p className="text-2xl font-bold">{stats.noApi}</p>
            </div>
            <Key className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">사업자등록</p>
              <p className="text-2xl font-bold">{stats.withBusinessNumber}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">일괄 작업</option>
            <option value="delete">삭제</option>
          </select>
          <button 
            onClick={handleBulkDelete}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            적용
          </button>
        </div>
        
        <div className="flex gap-2 items-center">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">모든 상태</option>
            <option value="api">API 연동</option>
            <option value="no-api">API 미연동</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            필터
          </button>
        </div>
      </div>

      {/* WordPress Style Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="manage-column check-column">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll}
                  checked={bulkSelection.length === suppliers.length && suppliers.length > 0}
                />
              </td>
              <th className="manage-column column-title column-primary">
                <span>공급자명</span>
              </th>
              <th className="manage-column">이메일</th>
              <th className="manage-column">연락처</th>
              <th className="manage-column">사업자등록번호</th>
              <th className="manage-column">API 상태</th>
              <th className="manage-column">날짜</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  로딩중...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  공급자가 없습니다
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <th scope="row" className="check-column">
                    <input 
                      type="checkbox"
                      checked={bulkSelection.includes(supplier.id)}
                      onChange={() => toggleBulkSelect(supplier.id)}
                    />
                  </th>
                  <td className="title column-title column-primary page-title">
                    <strong>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleEdit(supplier); }}
                        className="row-title"
                      >
                        {supplier.title}
                      </a>
                    </strong>
                    {supplier.content && (
                      <p className="text-sm text-gray-500 mt-1">
                        {supplier.content.substring(0, 100)}...
                      </p>
                    )}
                    <div className="row-actions">
                      <span className="edit">
                        <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(supplier); }}>
                          편집
                        </a>
                      </span>
                      {' | '}
                      <span className="trash">
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); handleDelete(supplier.id); }}
                          className="submitdelete"
                        >
                          휴지통
                        </a>
                      </span>
                      {' | '}
                      <span className="view">
                        <a href="#">보기</a>
                      </span>
                    </div>
                  </td>
                  <td>
                    {supplier.acf.supplier_email ? (
                      <a href={`mailto:${supplier.acf.supplier_email}`} className="text-wordpress-blue">
                        {supplier.acf.supplier_email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {supplier.acf.supplier_phone || <span className="text-gray-400">-</span>}
                  </td>
                  <td>
                    {supplier.acf.supplier_business_number ? (
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {supplier.acf.supplier_business_number}
                      </code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {getAPIStatus(supplier)}
                  </td>
                  <td className="date column-date">
                    <abbr title={new Date(supplier.createdAt).toLocaleString('ko-KR')}>
                      {new Date(supplier.createdAt).toLocaleDateString('ko-KR')}
                    </abbr>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Suppliers;