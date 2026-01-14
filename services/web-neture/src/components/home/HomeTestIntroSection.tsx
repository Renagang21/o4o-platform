/**
 * HomeTestIntroSection - 서비스 테스트 안내
 * 
 * Work Order: WO-NETURE-TEST-SECTIONS-V1
 * 
 * 역할: 테스트 목적과 참여 방법 안내 (정적 UI, 링크/버튼 없음)
 */

import React from 'react';

const testCards = [
    {
        id: 'purpose',
        icon: '🎯',
        title: '테스트 목적',
        description: '실제 사용 환경에서 서비스 안정성과 사용성을 검증합니다. 여러분의 피드백이 서비스 개선의 핵심입니다.',
    },
    {
        id: 'participate',
        icon: '✋',
        title: '참여 방법',
        description: '서비스를 자유롭게 사용하시고, 불편한 점이나 개선 아이디어를 아래 의견 게시판에 남겨주세요.',
    },
    {
        id: 'feedback',
        icon: '💬',
        title: '의견 남기기',
        description: '버그 리포트, 기능 제안, 사용성 개선 등 모든 의견을 환영합니다. 댓글로 추가 논의도 가능합니다.',
    },
    {
        id: 'reflection',
        icon: '🔄',
        title: '반영 방식',
        description: '수집된 의견은 우선순위에 따라 검토되며, 주요 개선사항은 서비스 업데이트를 통해 공지됩니다.',
    },
];

export function HomeTestIntroSection() {
    return (
        <section style={styles.section}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>서비스 테스트 & 개선 참여</h2>
                    <p style={styles.subtitle}>
                        더 나은 서비스를 만들기 위해 여러분의 의견이 필요합니다
                    </p>
                </div>

                <div style={styles.cardGrid}>
                    {testCards.map((card) => (
                        <div key={card.id} style={styles.card}>
                            <div style={styles.cardIcon}>{card.icon}</div>
                            <h3 style={styles.cardTitle}>{card.title}</h3>
                            <p style={styles.cardDescription}>{card.description}</p>
                        </div>
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
        textAlign: 'center',
        marginBottom: '48px',
    },
    title: {
        fontSize: '32px',
        fontWeight: 700,
        color: '#1e293b',
        margin: '0 0 12px 0',
    },
    subtitle: {
        fontSize: '16px',
        color: '#64748b',
        margin: 0,
    },
    cardGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px 24px',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
    },
    cardIcon: {
        fontSize: '40px',
        marginBottom: '16px',
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#1e293b',
        margin: '0 0 12px 0',
    },
    cardDescription: {
        fontSize: '14px',
        color: '#64748b',
        lineHeight: 1.6,
        margin: 0,
    },
};
