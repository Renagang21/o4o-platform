import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Award, TrendingUp, DollarSign } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import PartnerForm from './PartnerForm';

interface Partner {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  acf: {
    partner_type?: 'individual' | 'business';
    partner_grade?: 'bronze' | 'silver' | 'gold' | 'platinum';
    partner_referral_code?: string;
    partner_commission_rate?: number;
  };
}

const Partners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await dropshippingAPI.getPartners();
      if (response.success) {
        setPartners(response.data);
      }
    } catch (error) {
      
      toast.error('파트너 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await dropshippingAPI.deletePartner(id);
      if (response.success) {
        toast.success('파트너가 삭제되었습니다');
        fetchPartners();
      }
    } catch (error) {
      
      toast.error('파트너 삭제에 실패했습니다');
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelection.length === 0) {
      toast.error('삭제할 항목을 선택해주세요');
      return;
    }

    if (!confirm(`${bulkSelection.length}개 항목을 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(bulkSelection.map(id => dropshippingAPI.deletePartner(id)));
      toast.success('선택한 파트너가 삭제되었습니다');
      setBulkSelection([]);
      fetchPartners();
    } catch (error) {
      
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedPartner(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedPartner(null);
    fetchPartners();
  };

  const getGradeBadge = (grade?: string) => {
    const gradeColors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    };

    const gradeLabels = {
      bronze: '브론즈',
      silver: '실버',
      gold: '골드',
      platinum: '플래티넘'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gradeColors[grade as keyof typeof gradeColors] || 'bg-gray-100 text-gray-800'}`}>
        {gradeLabels[grade as keyof typeof gradeLabels] || '미설정'}
      </span>
    );
  };

  const getTypeBadge = (type?: string) => {
    const typeLabels = {
      individual: '개인',
      business: '사업자'
    };

    return (
      <span className="text-sm text-gray-600">
        {typeLabels[type as keyof typeof typeLabels] || '미설정'}
      </span>
    );
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelection(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (bulkSelection.length === partners.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(partners.map(p => p.id));
    }
  };

  if (showForm) {
    return (
      <PartnerForm 
        partner={selectedPartner} 
        onClose={handleFormClose}
      />
    );
  }

  // Calculate statistics
  const stats = {
    total: partners.length,
    individual: partners.filter(p => p.acf.partner_type === 'individual').length,
    business: partners.filter(p => p.acf.partner_type === 'business').length,
    averageCommission: partners.length > 0
      ? (partners.reduce((sum, p) => sum + (p.acf.partner_commission_rate || 0), 0) / partners.length).toFixed(1)
      : 0
  };

  return (
    <div className="p-6">
      {/* WordPress Admin Style Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">파트너</h1>
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
              <p className="text-gray-600 text-sm">전체 파트너</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">개인 파트너</p>
              <p className="text-2xl font-bold">{stats.individual}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">사업자 파트너</p>
              <p className="text-2xl font-bold">{stats.business}</p>
            </div>
            <Award className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">평균 수수료율</p>
              <p className="text-2xl font-bold">{stats.averageCommission}%</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-400" />
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
            <option value="">모든 유형</option>
            <option value="individual">개인</option>
            <option value="business">사업자</option>
          </select>
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">모든 등급</option>
            <option value="bronze">브론즈</option>
            <option value="silver">실버</option>
            <option value="gold">골드</option>
            <option value="platinum">플래티넘</option>
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
                  checked={bulkSelection.length === partners.length && partners.length > 0}
                />
              </td>
              <th className="manage-column column-title column-primary">
                <span>이름</span>
              </th>
              <th className="manage-column">추천 코드</th>
              <th className="manage-column">유형</th>
              <th className="manage-column">등급</th>
              <th className="manage-column">수수료율</th>
              <th className="manage-column">상태</th>
              <th className="manage-column">날짜</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  로딩중...
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  파트너가 없습니다
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id}>
                  <th scope="row" className="check-column">
                    <input 
                      type="checkbox"
                      checked={bulkSelection.includes(partner.id)}
                      onChange={() => toggleBulkSelect(partner.id)}
                    />
                  </th>
                  <td className="title column-title column-primary page-title">
                    <strong>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleEdit(partner); }}
                        className="row-title"
                      >
                        {partner.title}
                      </a>
                    </strong>
                    <div className="row-actions">
                      <span className="edit">
                        <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(partner); }}>
                          편집
                        </a>
                      </span>
                      {' | '}
                      <span className="trash">
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); handleDelete(partner.id); }}
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
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {partner.acf.partner_referral_code || '-'}
                    </code>
                  </td>
                  <td>{getTypeBadge(partner.acf.partner_type)}</td>
                  <td>{getGradeBadge(partner.acf.partner_grade)}</td>
                  <td>
                    <span className="text-sm font-medium">
                      {partner.acf.partner_commission_rate || 0}%
                    </span>
                  </td>
                  <td>
                    {partner.status === 'publish' ? (
                      <span className="text-green-600">공개</span>
                    ) : (
                      <span className="text-gray-500">임시글</span>
                    )}
                  </td>
                  <td className="date column-date">
                    <abbr title={new Date(partner.createdAt).toLocaleString('ko-KR')}>
                      {new Date(partner.createdAt).toLocaleDateString('ko-KR')}
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

export default Partners;