/**
 * HomeServiceUpdateSection - 서비스 업데이트 공지
 * 
 * Work Order: WO-NETURE-TEST-SECTIONS-V1
 * 
 * 역할: 운영자 공지사항 표시 (댓글 불가)
 * 게시판: service-update (운영자 전용 작성)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowRight } from 'lucide-react';

interface UpdatePost {
    id: string;
    title: string;
    publishedAt: string;
    category: string;
}

export function HomeServiceUpdateSection() {
    const [updates, setUpdates] = useState<UpdatePost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: 실제 포럼 API 연동
        // const fetchUpdates = async () => {
        //   const data = await forumApi.getPosts('service-update', { limit: 5 });
        //   setUpdates(data);
        // };

        // Mock data for now
        setTimeout(() => {
            setUpdates([
                {
                    id: '1',
                    title: '공급자 검색 필터 개선 완료',
                    publishedAt: '2026-01-14',
                    category: '기능 개선',
                },
                {
                    id: '2',
                    title: '모바일 반응형 UI 업데이트',
                    publishedAt: '2026-01-12',
                    category: 'UI/UX',
                },
                {
                    id: '3',
                    title: '로그인 성능 최적화 적용',
                    publishedAt: '2026-01-10',
                    category: '성능 개선',
                },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return (
            <section style={styles.section}>
                <div style={styles.container}>
                    <p style={styles.loading}>로딩 중...</p>
                </div>
            </section>
        );
    }

    return (
        <section style={styles.section}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerContent}>
                        <Bell style={styles.headerIcon} />
                        <div>
                            <h2 style={styles.title}>서비스 업데이트</h2>
                            <p style={styles.subtitle}>
                                최근 개선 사항과 새로운 기능을 확인하세요
                            </p>
                        </div>
                    </div>
                    <Link to="/forum/service-update" style={styles.moreLink}>
                        전체보기
                        <ArrowRight style={styles.arrowIcon} />
                    </Link>
                </div>

                <div style={styles.updateList}>
                    {updates.map((update) => (
                        <Link
                            key={update.id}
                            to={`/forum/service-update/${update.id}`}
                            style={styles.updateItem}
                        >
                            <div style={styles.updateBadge}>{update.category}</div>
                            <div style={styles.updateContent}>
                                <h3 style={styles.updateTitle}>{update.title}</h3>
                                <span style={styles.updateDate}>{update.publishedAt}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    section: {
        padding: '64px 0',
        backgroundColor: '#f8fafc',
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    headerIcon: {
        width: '32px',
        height: '32px',
        color: '#4f46e5',
    },
    title: {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1e293b',
        margin: '0 0 4px 0',
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0,
    },
    moreLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: '#4f46e5',
        textDecoration: 'none',
        fontWeight: 500,
    },
    arrowIcon: {
        width: '16px',
        height: '16px',
    },
    updateList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    updateItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        textDecoration: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    updateBadge: {
        padding: '6px 12px',
        backgroundColor: '#eef2ff',
        color: '#4f46e5',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    updateContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    updateTitle: {
        fontSize: '16px',
        fontWeight: 500,
        color: '#1e293b',
        margin: 0,
    },
    updateDate: {
        fontSize: '13px',
        color: '#94a3b8',
    },
    loading: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: '14px',
    },
};
