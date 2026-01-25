/**
 * WorkTasksPage - 개인 업무 관리
 *
 * WO-KPA-WORK-IMPLEMENT-V1
 * - 개인 기준 할 일 목록
 * - 체크리스트 형태
 * - 약국별 업무는 참고 정보로만 표시
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  done: boolean;
  category: 'daily' | 'weekly' | 'pharmacy';
  dueDate?: string;
}

// Mock 업무 데이터
const initialTasks: Task[] = [
  { id: 't1', title: '처방전 검토 완료', done: true, category: 'daily' },
  { id: 't2', title: '재고 현황 확인', done: false, category: 'daily' },
  { id: 't3', title: '고객 상담 기록 정리', done: false, category: 'daily' },
  { id: 't4', title: '주간 보고서 작성', done: false, category: 'weekly', dueDate: '2025-01-26' },
  { id: 't5', title: '보수교육 이수', done: false, category: 'weekly', dueDate: '2025-02-01' },
  { id: 't6', title: '오전 조제 업무 (약국 지정)', done: true, category: 'pharmacy' },
  { id: 't7', title: '재고 실사 참여 (약국 지정)', done: false, category: 'pharmacy', dueDate: '2025-01-27' },
];

export function WorkTasksPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;
  const userName = testUser?.name || '약사';

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'pharmacy'>('all');

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    ));
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.category === filter);

  const completedCount = tasks.filter(t => t.done).length;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/work" style={styles.backLink}>← 내 업무</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>업무 관리</h1>
            <p style={styles.subTitle}>{userName}님의 할 일 목록</p>
          </div>
          <div style={styles.summaryBadge}>
            {completedCount}/{tasks.length} 완료
          </div>
        </div>
      </header>

      {/* 필터 */}
      <div style={styles.filterRow}>
        {[
          { key: 'all', label: '전체' },
          { key: 'daily', label: '일일 업무' },
          { key: 'weekly', label: '주간 업무' },
          { key: 'pharmacy', label: '약국 지정' },
        ].map(f => (
          <button
            key={f.key}
            style={{
              ...styles.filterButton,
              backgroundColor: filter === f.key ? colors.primary : colors.white,
              color: filter === f.key ? colors.white : colors.neutral600,
            }}
            onClick={() => setFilter(f.key as typeof filter)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 업무 목록 */}
      <div style={styles.taskList}>
        {filteredTasks.map(task => (
          <div
            key={task.id}
            style={{
              ...styles.taskCard,
              opacity: task.done ? 0.7 : 1,
            }}
            onClick={() => toggleTask(task.id)}
          >
            <div style={styles.taskLeft}>
              <span style={{
                ...styles.checkbox,
                backgroundColor: task.done ? colors.primary : 'transparent',
                borderColor: task.done ? colors.primary : colors.neutral300,
              }}>
                {task.done && '✓'}
              </span>
              <div style={styles.taskInfo}>
                <span style={{
                  ...styles.taskTitle,
                  textDecoration: task.done ? 'line-through' : 'none',
                }}>
                  {task.title}
                </span>
                {task.dueDate && (
                  <span style={styles.dueDate}>마감: {task.dueDate}</span>
                )}
              </div>
            </div>
            <span style={{
              ...styles.categoryBadge,
              backgroundColor:
                task.category === 'daily' ? colors.info + '20' :
                task.category === 'weekly' ? colors.warning + '20' :
                colors.neutral100,
              color:
                task.category === 'daily' ? colors.info :
                task.category === 'weekly' ? colors.warning :
                colors.neutral600,
            }}>
              {task.category === 'daily' ? '일일' :
               task.category === 'weekly' ? '주간' : '약국'}
            </span>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          약국 지정 업무는 참고 정보입니다. 업무 배정 및 변경은 개설약사에게 문의하세요.
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: '12px',
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subTitle: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  summaryBadge: {
    padding: '8px 16px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  taskCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  taskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    color: colors.white,
    fontWeight: 600,
    flexShrink: 0,
  },
  taskInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  taskTitle: {
    fontSize: '0.9375rem',
    color: colors.neutral800,
    fontWeight: 500,
  },
  dueDate: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  categoryBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};
