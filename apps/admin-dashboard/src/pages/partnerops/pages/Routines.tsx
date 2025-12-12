/**
 * PartnerOps Routines Page
 *
 * Content/Routine management:
 * - Create/edit routines (product recommendations)
 * - Link products to routines
 * - View routine performance
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  TrendingUp,
  Link as LinkIcon,
} from 'lucide-react';

/**
 * Partner Routine (Partner-Core aligned)
 * Maps to PartnerRoutineDto from @o4o/partnerops
 */
interface Routine {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  productIds: string[];       // Changed from products
  productType?: string;
  status: 'draft' | 'published' | 'archived';  // Changed from isActive
  viewCount: number;          // Changed from views
  clickCount: number;         // Changed from clicks
  conversionCount: number;    // Changed from conversions
  createdAt: string;
  updatedAt: string;
}

const Routines: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    productIds: '',
  });

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/partnerops/routines');
      if (response.data?.data) {
        setRoutines(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch routines:', err);
      // Demo data
      setRoutines([
        {
          id: '1',
          partnerId: 'demo-partner',
          title: '겨울철 보습 루틴',
          description: '건조한 겨울철을 위한 보습 스킨케어 루틴입니다.',
          status: 'published',
          productIds: ['product-1', 'product-2', 'product-3'],
          viewCount: 1234,
          clickCount: 234,
          conversionCount: 12,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          partnerId: 'demo-partner',
          title: '민감 피부 진정 루틴',
          description: '민감한 피부를 위한 진정 케어 루틴입니다.',
          status: 'published',
          productIds: ['product-4', 'product-5'],
          viewCount: 892,
          clickCount: 156,
          conversionCount: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          partnerId: 'demo-partner',
          title: '여드름 관리 루틴',
          description: '트러블 피부를 위한 관리 루틴입니다.',
          status: 'draft',
          productIds: ['product-6'],
          viewCount: 456,
          clickCount: 78,
          conversionCount: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      const routine = routines.find((r) => r.id === id);
      if (routine) {
        setFormData({
          title: routine.title,
          description: routine.description || '',
          productIds: routine.productIds.join(', '),
        });
        setEditingId(id);
        setShowForm(true);
      }
    } else if (id === 'new' || window.location.pathname.includes('/new')) {
      setShowForm(true);
      setEditingId(null);
      setFormData({ title: '', description: '', productIds: '' });
    }
  }, [id, routines]);

  const handleSubmit = async () => {
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        productIds: formData.productIds.split(',').map((p) => p.trim()).filter(Boolean),
      };

      if (editingId) {
        await authClient.api.put(`/partnerops/routines/${editingId}`, data);
      } else {
        await authClient.api.post('/partnerops/routines', data);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', description: '', productIds: '' });
      fetchRoutines();
      navigate('/partnerops/routines');
    } catch (err) {
      console.error('Failed to save routine:', err);
      alert('루틴 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('이 루틴을 삭제하시겠습니까?')) return;

    try {
      await authClient.api.delete(`/partnerops/routines/${routineId}`);
      fetchRoutines();
    } catch (err) {
      console.error('Failed to delete routine:', err);
      alert('루틴 삭제에 실패했습니다.');
    }
  };

  const toggleStatus = async (routine: Routine) => {
    try {
      const newStatus = routine.status === 'published' ? 'draft' : 'published';
      await authClient.api.put(`/partnerops/routines/${routine.id}`, {
        status: newStatus,
      });
      fetchRoutines();
    } catch (err) {
      console.error('Failed to toggle routine:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">콘텐츠/루틴 관리</h1>
          <p className="text-gray-600">상품 추천 루틴을 만들고 관리합니다</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ title: '', description: '', productIds: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          새 루틴
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? '루틴 수정' : '새 루틴 만들기'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="루틴 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="루틴 설명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">상품 ID (쉼표로 구분)</label>
                <input
                  type="text"
                  value={formData.productIds}
                  onChange={(e) => setFormData({ ...formData, productIds: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="product-1, product-2, product-3"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? '수정' : '생성'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  navigate('/partnerops/routines');
                }}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routines List */}
      <div className="space-y-4">
        {routines.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            아직 생성된 루틴이 없습니다. 첫 번째 루틴을 만들어보세요.
          </div>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{routine.title}</h3>
                    {routine.status === 'published' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        게시됨
                      </span>
                    ) : routine.status === 'draft' ? (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded text-xs">
                        초안
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        보관됨
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{routine.description || '-'}</p>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Package className="w-4 h-4" />
                      {routine.productIds.length}개 상품
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Eye className="w-4 h-4" />
                      {routine.viewCount.toLocaleString()} 조회
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <LinkIcon className="w-4 h-4" />
                      {routine.clickCount.toLocaleString()} 클릭
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      {routine.conversionCount} 전환
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(routine)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title={routine.status === 'published' ? '비게시' : '게시'}
                  >
                    {routine.status === 'published' ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setFormData({
                        title: routine.title,
                        description: routine.description || '',
                        productIds: routine.productIds.join(', '),
                      });
                      setEditingId(routine.id);
                      setShowForm(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="수정"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(routine.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Routines;
