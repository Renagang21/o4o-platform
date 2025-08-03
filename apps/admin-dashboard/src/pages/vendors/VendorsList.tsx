import { ChangeEvent, useState } from 'react';
import { Store, UserCheck, Clock, Ban, Search, Filter, MoreVertical, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Vendor {
  id: string;
  name: string;
  email: string;
  businessName: string;
  status: 'active' | 'pending' | 'suspended';
  products: number;
  revenue: number;
  commission: number;
  joinedAt: string;
}

const mockVendors: Vendor[] = [
  {
    id: '1',
    name: '김판매',
    email: 'seller1@example.com',
    businessName: '프리미엄 건강식품',
    status: 'active',
    products: 45,
    revenue: 15000000,
    commission: 1500000,
    joinedAt: '2024-01-15'
  },
  {
    id: '2',
    name: '이공급',
    email: 'supplier2@example.com',
    businessName: '오가닉 라이프',
    status: 'active',
    products: 32,
    revenue: 8500000,
    commission: 850000,
    joinedAt: '2024-02-20'
  },
  {
    id: '3',
    name: '박판매',
    email: 'seller3@example.com',
    businessName: '헬스케어 프로',
    status: 'pending',
    products: 0,
    revenue: 0,
    commission: 0,
    joinedAt: '2024-03-10'
  },
  {
    id: '4',
    name: '최공급',
    email: 'supplier4@example.com',
    businessName: '웰빙 마켓',
    status: 'suspended',
    products: 28,
    revenue: 5200000,
    commission: 520000,
    joinedAt: '2024-01-05'
  }
];

const VendorsList = () => {
  const [vendors] = useState(mockVendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3" />
            활성
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            승인 대기
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban className="w-3 h-3" />
            정지
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Store className="w-8 h-8 text-modern-primary" />
            판매자/공급자 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            등록된 판매자 및 공급자를 관리하고 승인 상태를 확인하세요.
          </p>
        </div>
        <Link
          to="/vendors/new"
          className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors"
        >
          새 판매자 추가
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전체 판매자</p>
                <p className="text-2xl font-bold text-modern-text-primary">{vendors.length}</p>
              </div>
              <Store className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">활성 판매자</p>
                <p className="text-2xl font-bold text-modern-success">
                  {vendors.filter(v => v.status === 'active').length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">승인 대기</p>
                <p className="text-2xl font-bold text-modern-warning">
                  {vendors.filter(v => v.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 수수료</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{vendors.reduce((sum, v) => sum + v.commission, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="이름, 사업자명, 이메일로 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="pending">승인 대기</option>
            <option value="suspended">정지</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="wp-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  판매자 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상품 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  매출액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  수수료
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  가입일
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {filteredVendors.map((vendor: any) => (
                <tr key={vendor.id} className="hover:bg-modern-bg-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-modern-primary rounded-full flex items-center justify-center">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-modern-text-primary">
                          {vendor.businessName}
                        </div>
                        <div className="text-sm text-modern-text-secondary">
                          {vendor.name} ({vendor.email})
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(vendor.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {vendor.products}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    ₩{vendor.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    ₩{vendor.commission.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-secondary">
                    {new Date(vendor.joinedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-modern-text-secondary hover:text-modern-text-primary">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorsList;