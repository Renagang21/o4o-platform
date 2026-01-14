/**
 * PartnershipRequestDetailPage - 파트너십 신청 상세 (Admin)
 *
 * 개별 파트너십 신청의 상세 정보를 확인하고 상태를 업데이트하는 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Product {
    name: string;
    category?: string;
}

interface PartnershipRequest {
    id: string;
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns: boolean;
    promotionContent: boolean;
    promotionBanner: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Product[];
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export default function PartnershipRequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<PartnershipRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (id) {
            fetchRequestDetail();
        }
    }, [id]);

    const fetchRequestDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch partnership request detail');
            }

            const data = await response.json();
            setRequest(data.data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: 'approved' | 'rejected') => {
        if (!id) return;

        try {
            setUpdating(true);
            const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            // Refresh the data
            await fetchRequestDetail();
            alert(`신청이 ${newStatus === 'approved' ? '승인' : '거절'}되었습니다.`);
        } catch (err) {
            alert(`상태 업데이트 실패: ${(err as Error).message}`);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="p-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">Error: {error || 'Request not found'}</p>
                </div>
                <Link to="/neture/partnership-requests" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로 돌아가기
                </Link>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        const config = {
            pending: { icon: Clock, color: 'yellow', label: '검토 중' },
            approved: { icon: CheckCircle, color: 'green', label: '승인됨' },
            rejected: { icon: XCircle, color: 'red', label: '거절됨' },
        };
        const { icon: Icon, color, label } = config[status as keyof typeof config];
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${color}-100 text-${color}-800`}>
                <Icon className="w-4 h-4 mr-1" />
                {label}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <Link
                to="/neture/partnership-requests"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로 돌아가기
            </Link>

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">파트너십 신청 상세</h1>
                    <p className="text-gray-600">신청 ID: {request.id}</p>
                </div>
                {getStatusBadge(request.status)}
            </div>

            {/* Status Actions */}
            {request.status === 'pending' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">이 신청을 검토하고 승인 또는 거절하세요:</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => updateStatus('approved')}
                            disabled={updating}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            승인
                        </button>
                        <button
                            onClick={() => updateStatus('rejected')}
                            disabled={updating}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            거절
                        </button>
                    </div>
                </div>
            )}

            {/* Details */}
            <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">판매자명</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.sellerName}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">서비스 유형</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.sellerServiceType || '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">스토어 URL</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {request.sellerStoreUrl ? (
                                    <a href={request.sellerStoreUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {request.sellerStoreUrl}
                                    </a>
                                ) : '-'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* 기간 및 조건 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">기간 및 조건</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">시작일</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {request.periodStart ? new Date(request.periodStart).toLocaleDateString('ko-KR') : '-'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">종료일</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {request.periodEnd ? new Date(request.periodEnd).toLocaleDateString('ko-KR') : '-'}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">수익 구조</dt>
                            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.revenueStructure || '-'}</dd>
                        </div>
                    </dl>
                </div>

                {/* 프로모션 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">프로모션 범위</h2>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <input type="checkbox" checked={request.promotionSns} disabled className="rounded border-gray-300 text-blue-600" />
                            <span className="ml-2 text-sm text-gray-700">SNS 홍보</span>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" checked={request.promotionContent} disabled className="rounded border-gray-300 text-blue-600" />
                            <span className="ml-2 text-sm text-gray-700">콘텐츠 마케팅</span>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" checked={request.promotionBanner} disabled className="rounded border-gray-300 text-blue-600" />
                            <span className="ml-2 text-sm text-gray-700">배너 광고</span>
                        </div>
                        {request.promotionOther && (
                            <div className="mt-2">
                                <dt className="text-sm font-medium text-gray-500">기타</dt>
                                <dd className="mt-1 text-sm text-gray-900">{request.promotionOther}</dd>
                            </div>
                        )}
                    </div>
                </div>

                {/* 제품 정보 */}
                {request.products && request.products.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">취급 제품</h2>
                        <div className="space-y-3">
                            {request.products.map((product, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                    {product.category && <p className="text-sm text-gray-600">카테고리: {product.category}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 연락처 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">연락처</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">이메일</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.contactEmail || '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">전화번호</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.contactPhone || '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">카카오톡 채널</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {request.contactKakao ? (
                                    <a href={request.contactKakao} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {request.contactKakao}
                                    </a>
                                ) : '-'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* 메타 정보 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">신청 정보</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">신청일</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {new Date(request.createdAt).toLocaleString('ko-KR')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">최종 수정일</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {new Date(request.updatedAt).toLocaleString('ko-KR')}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
