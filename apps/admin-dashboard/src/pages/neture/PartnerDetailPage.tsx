/**
 * Neture Admin Partner Detail Page
 *
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

// Types
interface PartnerContact {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

interface PartnerAddress {
  zipCode?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
}

interface Partner {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  type: string;
  status: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  contact: PartnerContact | null;
  address: PartnerAddress | null;
  created_at: string;
  updated_at: string;
}

interface PartnerFormData {
  name: string;
  business_name: string;
  business_number: string;
  type: string;
  description: string;
  logo: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_position: string;
  address_zipCode: string;
  address_address1: string;
  address_address2: string;
  address_city: string;
}

const TYPE_OPTIONS = [
  { value: 'seller', label: '판매자' },
  { value: 'supplier', label: '공급자' },
  { value: 'partner', label: '파트너' },
];

async function fetchPartner(id: string): Promise<{ data: Partner }> {
  const response = await authClient.api.get(`/api/v1/neture/admin/partners/${id}`);
  return response.data;
}

async function createPartner(data: Partial<Partner>): Promise<{ data: Partner }> {
  const response = await authClient.api.post('/api/v1/neture/admin/partners', data);
  return response.data;
}

async function updatePartner(id: string, data: Partial<Partner>): Promise<{ data: Partner }> {
  const response = await authClient.api.patch(`/api/v1/neture/admin/partners/${id}`, data);
  return response.data;
}

const PartnerDetailPage: React.FC = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = partnerId === 'new';

  const [formData, setFormData] = useState<PartnerFormData>({
    name: '',
    business_name: '',
    business_number: '',
    type: 'partner',
    description: '',
    logo: '',
    website: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_position: '',
    address_zipCode: '',
    address_address1: '',
    address_address2: '',
    address_city: '',
  });

  const { data: partnerResponse, isLoading } = useQuery({
    queryKey: ['neture', 'admin', 'partner', partnerId],
    queryFn: () => fetchPartner(partnerId!),
    enabled: !isNew && !!partnerId,
  });

  useEffect(() => {
    if (partnerResponse?.data) {
      const partner = partnerResponse.data;
      setFormData({
        name: partner.name,
        business_name: partner.business_name || '',
        business_number: partner.business_number || '',
        type: partner.type,
        description: partner.description || '',
        logo: partner.logo || '',
        website: partner.website || '',
        contact_name: partner.contact?.name || '',
        contact_email: partner.contact?.email || '',
        contact_phone: partner.contact?.phone || '',
        contact_position: partner.contact?.position || '',
        address_zipCode: partner.address?.zipCode || '',
        address_address1: partner.address?.address1 || '',
        address_address2: partner.address?.address2 || '',
        address_city: partner.address?.city || '',
      });
    }
  }, [partnerResponse]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Partner>) => {
      if (isNew) {
        return createPartner(data);
      }
      return updatePartner(partnerId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'partners'] });
      navigate('/neture/partners');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const partnerData: Partial<Partner> = {
      name: formData.name,
      business_name: formData.business_name || null,
      business_number: formData.business_number || null,
      type: formData.type,
      description: formData.description || null,
      logo: formData.logo || null,
      website: formData.website || null,
      contact: (formData.contact_name || formData.contact_email || formData.contact_phone) ? {
        name: formData.contact_name || undefined,
        email: formData.contact_email || undefined,
        phone: formData.contact_phone || undefined,
        position: formData.contact_position || undefined,
      } : null,
      address: (formData.address_zipCode || formData.address_address1) ? {
        zipCode: formData.address_zipCode || undefined,
        address1: formData.address_address1 || undefined,
        address2: formData.address_address2 || undefined,
        city: formData.address_city || undefined,
      } : null,
    };

    saveMutation.mutate(partnerData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/neture/partners" className="text-blue-600 hover:underline text-sm">
          ← 파트너 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isNew ? '새 파트너 등록' : '파트너 수정'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">기본 정보</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                파트너명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="파트너명을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사업자명</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
              <input
                type="text"
                name="business_number"
                value={formData.business_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123-45-67890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">소개</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="파트너에 대한 간단한 소개"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">로고 URL</label>
              <input
                type="url"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">담당자 정보</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
              <input
                type="text"
                name="contact_position"
                value={formData.contact_position}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">주소 정보</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
              <input
                type="text"
                name="address_zipCode"
                value={formData.address_zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">도시</label>
              <input
                type="text"
                name="address_city"
                value={formData.address_city}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <input
              type="text"
              name="address_address1"
              value={formData.address_address1}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
              placeholder="기본 주소"
            />
            <input
              type="text"
              name="address_address2"
              value={formData.address_address2}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="상세 주소"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link
            to="/neture/partners"
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? '저장 중...' : isNew ? '등록' : '저장'}
          </button>
        </div>

        {saveMutation.isError && (
          <div className="text-red-600 text-sm">
            저장에 실패했습니다. 다시 시도해주세요.
          </div>
        )}
      </form>
    </div>
  );
};

export default PartnerDetailPage;
