import React, { useState, useEffect, useMemo } from 'react';
import { 
  Megaphone,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit,
  Eye,
  Play,
  Pause,
  ExternalLink,
  Copy,
  TrendingUp,
  Target,
  MousePointer,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { Campaign, getCampaignStatusText, getCampaignStatusColor } from '../types/partner';
import { SellerProduct, generateSellerProducts } from '../types/seller';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { ToastProvider, useSuccessToast, useWarningToast, useInfoToast } from '../ui/ToastNotification';

interface PartnerMarketingPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

interface CampaignFormData {
  name: string;
  sellerId: string;
  sellerName: string;
  productId: number;
  productName: string;
  productImage: string;
  commissionRate: number;
  startDate: string;
  endDate?: string;
  description: string;
}

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onSave: (campaignData: CampaignFormData) => void;
  sellerProducts: SellerProduct[];
}

// Generate sample campaigns
const generateCampaigns = (): Campaign[] => {
  return [
    {
      id: 'CAM001',
      name: '무선 이어폰 여름 프로모션',
      sellerId: 'SELL001',
      sellerName: '스마트몰',
      productId: 1,
      productName: '무선 블루투스 이어폰 프리미엄',
      productImage: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=이어폰',
      commissionRate: 5.0,
      status: 'active',
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2024-07-31T23:59:59Z',
      totalClicks: 2456,
      totalConversions: 124,
      totalCommission: 551600,
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z'
    },
    {
      id: 'CAM002',
      name: '게이밍 마우스 리뷰 캠페인',
      sellerId: 'SELL003',
      sellerName: '게이밍스토어',
      productId: 2,
      productName: '무선 마우스 게이밍용',
      productImage: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=마우스',
      commissionRate: 6.0,
      status: 'active',
      startDate: '2024-06-15T00:00:00Z',
      totalClicks: 1834,
      totalConversions: 89,
      totalCommission: 368460,
      createdAt: '2024-06-15T00:00:00Z',
      updatedAt: '2024-06-29T09:30:00Z'
    },
    {
      id: 'CAM003',
      name: 'USB-C 케이블 대량 구매 이벤트',
      sellerId: 'SELL001',
      sellerName: '스마트몰',
      productId: 3,
      productName: 'USB-C 고속 충전 케이블 3m',
      productImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=케이블',
      commissionRate: 4.0,
      status: 'completed',
      startDate: '2024-05-01T00:00:00Z',
      endDate: '2024-05-31T23:59:59Z',
      totalClicks: 3421,
      totalConversions: 203,
      totalCommission: 134058,
      createdAt: '2024-05-01T00:00:00Z',
      updatedAt: '2024-05-31T23:59:59Z'
    },
    {
      id: 'CAM004',
      name: '스마트 워치 밴드 신제품 출시',
      sellerId: 'SELL002',
      sellerName: '액세서리마트',
      productId: 5,
      productName: '스마트 워치 밴드 실리콘',
      productImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=워치밴드',
      commissionRate: 7.0,
      status: 'paused',
      startDate: '2024-06-20T00:00:00Z',
      totalClicks: 892,
      totalConversions: 34,
      totalCommission: 64260,
      createdAt: '2024-06-20T00:00:00Z',
      updatedAt: '2024-06-25T14:00:00Z'
    },
    {
      id: 'CAM005',
      name: '블루투스 스피커 신규 출시',
      sellerId: 'SELL004',
      sellerName: '오디오샵',
      productId: 6,
      productName: '휴대용 블루투스 스피커',
      productImage: 'https://via.placeholder.com/400x400/EC4899/FFFFFF?text=스피커',
      commissionRate: 5.5,
      status: 'pending',
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-08-31T23:59:59Z',
      totalClicks: 0,
      totalConversions: 0,
      totalCommission: 0,
      createdAt: '2024-06-28T00:00:00Z',
      updatedAt: '2024-06-28T00:00:00Z'
    }
  ];
};

// Campaign Modal Component
const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSave,
  sellerProducts
}) => {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    sellerId: '',
    sellerName: '',
    productId: 0,
    productName: '',
    productImage: '',
    commissionRate: 5.0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        sellerId: campaign.sellerId,
        sellerName: campaign.sellerName,
        productId: campaign.productId,
        productName: campaign.productName,
        productImage: campaign.productImage,
        commissionRate: campaign.commissionRate,
        startDate: campaign.startDate.split('T')[0],
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        description: ''
      });
    } else {
      setFormData({
        name: '',
        sellerId: '',
        sellerName: '',
        productId: 0,
        productName: '',
        productImage: '',
        commissionRate: 5.0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        description: ''
      });
      setSelectedProduct(null);
    }
  }, [campaign, isOpen]);

  const handleProductSelect = (product: SellerProduct) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      sellerId: 'SELL001', // Default seller ID
      sellerName: '스마트몰', // Default seller name
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      commissionRate: product.partnerCommissionRate
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.productId) {
      return;
    }
    onSave(formData);
    onClose();
  };

  const isFormValid = formData.name && formData.productId && formData.commissionRate >= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={campaign ? '캠페인 수정' : '새 캠페인 생성'}
    >
      <ModalBody>
        <div className="space-y-6">
          {/* Campaign Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                캠페인 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 여름 프로모션 캠페인"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                캠페인 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="캠페인에 대한 설명을 입력하세요..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              홍보할 상품 선택 *
            </label>
            {selectedProduct ? (
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-600">
                      판매가: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(selectedProduct.sellerPrice)}
                    </p>
                    <p className="text-sm text-green-600">
                      커미션: {selectedProduct.partnerCommissionRate}%
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                {sellerProducts.filter(p => p.isActive).map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(product.sellerPrice)} • 
                        커미션 {product.partnerCommissionRate}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                커미션율 (%)
              </label>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                min={0}
                max={20}
                step={0.1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일 *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일 (선택사항)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalButton variant="secondary" onClick={onClose}>
          취소
        </ModalButton>
        <ModalButton 
          variant="primary" 
          onClick={handleSave}
          disabled={!isFormValid}
        >
          {campaign ? '수정' : '생성'}
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
};

// UTM Link Generator Component
const UTMLinkGenerator: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const [utmParams, setUtmParams] = useState({
    source: 'partner',
    medium: 'affiliate',
    campaign: campaign.name.toLowerCase().replace(/\s+/g, '-'),
    term: '',
    content: ''
  });

  const baseUrl = `https://example.com/product/${campaign.productId}`;
  const utmUrl = `${baseUrl}?utm_source=${utmParams.source}&utm_medium=${utmParams.medium}&utm_campaign=${utmParams.campaign}${utmParams.term ? `&utm_term=${utmParams.term}` : ''}${utmParams.content ? `&utm_content=${utmParams.content}` : ''}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(utmUrl);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <input
            type="text"
            value={utmParams.source}
            onChange={(e) => setUtmParams(prev => ({ ...prev, source: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medium
          </label>
          <input
            type="text"
            value={utmParams.medium}
            onChange={(e) => setUtmParams(prev => ({ ...prev, medium: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign
          </label>
          <input
            type="text"
            value={utmParams.campaign}
            onChange={(e) => setUtmParams(prev => ({ ...prev, campaign: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term (optional)
          </label>
          <input
            type="text"
            value={utmParams.term}
            onChange={(e) => setUtmParams(prev => ({ ...prev, term: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          생성된 UTM 링크
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={utmUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md"
          />
          <button
            onClick={copyToClipboard}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main content component
const PartnerMarketingContent: React.FC<PartnerMarketingPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(generateCampaigns());
  const [sellerProducts] = useState<SellerProduct[]>(generateSellerProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'pending'>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isUTMModalOpen, setIsUTMModalOpen] = useState(false);
  const [utmCampaign, setUtmCampaign] = useState<Campaign | null>(null);

  const showSuccess = useSuccessToast();
  const showWarning = useWarningToast();
  const showInfo = useInfoToast();

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(search) ||
        campaign.productName.toLowerCase().includes(search) ||
        campaign.sellerName.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [campaigns, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;
    const totalClicks = campaigns.reduce((sum, c) => sum + c.totalClicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.totalConversions, 0);
    const totalCommission = campaigns.reduce((sum, c) => sum + c.totalCommission, 0);
    const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      activeCampaigns,
      pausedCampaigns,
      completedCampaigns,
      pendingCampaigns,
      totalClicks,
      totalConversions,
      totalCommission,
      averageConversionRate
    };
  }, [campaigns]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setIsCampaignModalOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = (campaignData: CampaignFormData) => {
    if (selectedCampaign) {
      // Update existing campaign
      setCampaigns(prev => prev.map(c => 
        c.id === selectedCampaign.id 
          ? { 
              ...c, 
              ...campaignData,
              startDate: campaignData.startDate + 'T00:00:00Z',
              endDate: campaignData.endDate ? campaignData.endDate + 'T23:59:59Z' : undefined,
              updatedAt: new Date().toISOString()
            }
          : c
      ));
      showSuccess('캠페인 수정', '캠페인이 성공적으로 수정되었습니다.');
    } else {
      // Create new campaign
      const newCampaign: Campaign = {
        id: `CAM${String(campaigns.length + 1).padStart(3, '0')}`,
        ...campaignData,
        status: 'pending',
        startDate: campaignData.startDate + 'T00:00:00Z',
        endDate: campaignData.endDate ? campaignData.endDate + 'T23:59:59Z' : undefined,
        totalClicks: 0,
        totalConversions: 0,
        totalCommission: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      showSuccess('캠페인 생성', '새 캠페인이 성공적으로 생성되었습니다.');
    }
  };

  const handleToggleStatus = (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    setCampaigns(prev => prev.map(c => 
      c.id === campaign.id 
        ? { ...c, status: newStatus, updatedAt: new Date().toISOString() }
        : c
    ));
    showSuccess(
      newStatus === 'active' ? '캠페인 시작' : '캠페인 일시정지',
      `${campaign.name}이(가) ${newStatus === 'active' ? '시작' : '일시정지'}되었습니다.`
    );
  };

  const handleGenerateUTM = (campaign: Campaign) => {
    setUtmCampaign(campaign);
    setIsUTMModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              마케팅 관리 📢
            </h1>
            <p className="text-gray-700 font-medium">
              캠페인을 생성하고 관리하여 효과적인 제품 홍보를 진행하세요.
            </p>
          </div>
          
          <button
            onClick={handleCreateCampaign}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            새 캠페인
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">진행중</div>
              <div className="text-xl font-bold text-green-600">{stats.activeCampaigns}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Pause className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">일시정지</div>
              <div className="text-xl font-bold text-yellow-600">{stats.pausedCampaigns}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">완료</div>
              <div className="text-xl font-bold text-blue-600">{stats.completedCampaigns}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">승인대기</div>
              <div className="text-xl font-bold text-orange-600">{stats.pendingCampaigns}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">총 클릭</div>
              <div className="text-lg font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</div>
            </div>
            <MousePointer className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">총 전환</div>
              <div className="text-lg font-bold text-purple-600">{stats.totalConversions.toLocaleString()}</div>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">평균 전환율</div>
              <div className="text-lg font-bold text-green-600">{stats.averageConversionRate.toFixed(1)}%</div>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">총 커미션</div>
              <div className="text-lg font-bold text-orange-600">{formatCurrency(stats.totalCommission)}</div>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="캠페인명, 상품명, 판매자로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 상태</option>
            <option value="active">진행중</option>
            <option value="paused">일시정지</option>
            <option value="completed">완료</option>
            <option value="pending">승인대기</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-200">
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : '등록된 캠페인이 없습니다'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? '다른 검색어나 필터를 시도해보세요.'
                  : '첫 번째 마케팅 캠페인을 생성해보세요.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={handleCreateCampaign}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  캠페인 생성하기
                </button>
              )}
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img
                      src={campaign.productImage}
                      alt={campaign.productName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </div>

                  {/* Campaign Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">
                            {campaign.sellerName} • {campaign.productName}
                          </span>
                          <StatusBadge 
                            status={getCampaignStatusText(campaign.status)} 
                            size="sm" 
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        {campaign.status === 'active' && (
                          <button
                            onClick={() => handleGenerateUTM(campaign)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="UTM 링크 생성"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        {(campaign.status === 'active' || campaign.status === 'paused') && (
                          <button
                            onClick={() => handleToggleStatus(campaign)}
                            className={`p-2 rounded-md transition-colors ${
                              campaign.status === 'active'
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={campaign.status === 'active' ? '일시정지' : '시작'}
                          >
                            {campaign.status === 'active' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Campaign Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                      <div>
                        <div className="text-xs text-gray-500">커미션율</div>
                        <div className="text-sm font-bold text-orange-600">
                          {campaign.commissionRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">클릭수</div>
                        <div className="text-sm font-bold text-blue-600">
                          {campaign.totalClicks.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">전환수</div>
                        <div className="text-sm font-bold text-purple-600">
                          {campaign.totalConversions.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">전환율</div>
                        <div className="text-sm font-bold text-green-600">
                          {campaign.totalClicks > 0 ? ((campaign.totalConversions / campaign.totalClicks) * 100).toFixed(1) : '0.0'}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">커미션</div>
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(campaign.totalCommission)}
                        </div>
                      </div>
                    </div>

                    {/* Campaign Period */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(campaign.startDate)}
                          {campaign.endDate && ` ~ ${formatDate(campaign.endDate)}`}
                        </span>
                      </div>
                      <div className="text-xs">
                        마지막 업데이트: {formatDate(campaign.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        campaign={selectedCampaign}
        onSave={handleSaveCampaign}
        sellerProducts={sellerProducts}
      />

      {/* UTM Link Modal */}
      <Modal
        isOpen={isUTMModalOpen}
        onClose={() => setIsUTMModalOpen(false)}
        size="lg"
        title="UTM 링크 생성"
      >
        <ModalBody>
          {utmCampaign && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{utmCampaign.name}</h4>
                <p className="text-sm text-gray-600">{utmCampaign.productName}</p>
              </div>
              <UTMLinkGenerator campaign={utmCampaign} />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <ModalButton variant="primary" onClick={() => setIsUTMModalOpen(false)}>
            완료
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// Main component with providers
export const PartnerMarketingPage: React.FC<PartnerMarketingPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <PartnerMarketingContent {...props} />
    </ToastProvider>
  );
};