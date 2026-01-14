/**
 * HomeTestFeedbackSection - 테스트 의견 게시판
 * 
 * Work Order: WO-NETURE-TEST-SECTIONS-V1
 * 
 * 역할: 사용자 테스트 의견 수집 (포럼 API 연동)
 * 게시판: test-feedback (댓글 가능)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight } from 'lucide-react';

interface ForumPost {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    commentCount: number;
}

export function HomeTestFeedbackSection() {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: 실제 포럼 API 연동
        // const fetchPosts = async () => {
        //   const data = await forumApi.getPosts('test-feedback', { limit: 5 });
        //   setPosts(data);
        // };

        // Mock data for now
        setTimeout(() => {
            setPosts([
                {
                    id: '1',
                    title: '로그인 후 대시보드 로딩이 느려요',
                    author: '사용자A',
                    createdAt: '2026-01-14',
                    commentCount: 3,
                },
                {
                    id: '2',
                    title: '공급자 검색 필터 추가 제안',
                    author: '사용자B',
                    createdAt: '2026-01-13',
                    commentCount: 1,
                },
                {
                    id: '3',
                    title: '모바일에서 테이블이 잘려 보입니다',
                    author: '사용자C',
                    createdAt: '2026-01-12',
                    commentCount: 5,
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
                    <div>
                        <h2 style={styles.title}>테스트 의견</h2>
                        <p style={styles.subtitle}>
                            서비스 개선을 위한 여러분의 의견을 들려주세요
                        </p>
                    </div>
                    <Link to="/forum/test-feedback" style={styles.moreLink}>
                        더보기
                        <ArrowRight style={styles.arrowIcon} />
                    </Link>
                </div>

                <div style={styles.postList}>
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            to={`/forum/test-feedback/${post.id}`}
                            style={styles.postItem}
                        >
                            <div style={styles.postContent}>
                                <h3 style={styles.postTitle}>{post.title}</h3>
                                <div style={styles.postMeta}>
                                    <span style={styles.postAuthor}>{post.author}</span>
                                    <span style={styles.postDivider}>·</span>
                                    <span style={styles.postDate}>{post.createdAt}</span>
                                </div>
                            </div>
                            <div style={styles.postComments}>
                                <MessageSquare style={styles.commentIcon} />
                                <span style={styles.commentCount}>{post.commentCount}</span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div style={styles.footer}>
                    <Link to="/forum/test-feedback/new" style={styles.writeButton}>
                        의견 작성하기
                    </Link>
                </div>
            </div>
        </section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    section: {
        padding: '64px 0',
        backgroundColor: '#ffffff',
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1e293b',
        margin: '0 0 8px 0',
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
    postList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
    },
    postItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'background-color 0.2s',
    },
    postContent: {
        flex: 1,
    },
    postTitle: {
        fontSize: '16px',
        fontWeight: 500,
        color: '#1e293b',
        margin: '0 0 8px 0',
    },
    postMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#94a3b8',
    },
    postAuthor: {},
    postDivider: {},
    postDate: {},
    postComments: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#64748b',
    },
    commentIcon: {
        width: '18px',
        height: '18px',
    },
    commentCount: {
        fontSize: '14px',
        fontWeight: 500,
    },
    footer: {
        textAlign: 'center',
    },
    writeButton: {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
    },
    loading: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: '14px',
    },
};
