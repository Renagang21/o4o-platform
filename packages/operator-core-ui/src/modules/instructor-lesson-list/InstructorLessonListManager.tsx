/**
 * InstructorLessonListManager — 강사 강의 편집의 레슨 목록·순서 관리 공통 shell
 *
 * WO-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1
 *
 * KPA `CourseEditPage` 레슨 섹션을 canonical 로 추출한 **순수 목록/순서 shell**.
 * - 레슨 목록 렌더 / 순서 표시 / drag-reorder / 추가·편집·삭제 트리거 / empty·loading 표시.
 *
 * 경계(엄수):
 * - **API client 를 직접 import 하지 않는다.** 삭제/순서변경/재조회는 wrapper 가 주입(onDelete/onReorder).
 * - **LessonModal / editor(RichText·video·article·quiz·assignment·AI)는 소유하지 않는다.**
 *   `renderEditor(lesson|null, {close})` render-prop 으로 wrapper 가 주입. manager 는 open 상태만 소유.
 * - drag-reorder 는 wrapper 의 `onReorder` 가 있을 때만 활성(없으면 정적 목록).
 *
 * 소비: KPA CourseEditPage, GlycoPharm InstructorCourseEditPage.
 *       K-Cosmetics 는 editor 미구축(Phase 1-B) — 미적용.
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface InstructorLessonListItem {
  id: string;
  title: string;
  /** 레슨 타입 키 (video/article/quiz/assignment 등) — 라벨은 lessonTypeLabel 로 매핑 */
  type: string;
  /** 분 단위. 0/미설정 시 '시간 미설정' */
  duration?: number;
  order: number;
}

export interface InstructorLessonListHandle {
  /** 외부(예: 생성 배너)에서 새 레슨 추가 모달 열기 */
  openAdd: () => void;
}

export interface InstructorLessonListManagerProps {
  lessons: InstructorLessonListItem[];
  /**
   * 순서 변경 — 재배열된 목록을 받아 wrapper 가 API(reorder)+상태 갱신.
   * 미지정 시 drag-reorder 비활성(정적 목록).
   */
  onReorder?: (orderedLessons: InstructorLessonListItem[]) => void | Promise<void>;
  /** 삭제 — wrapper 가 confirm+API+reload. 미지정 시 삭제 버튼 미노출. */
  onDelete?: (lesson: InstructorLessonListItem) => void;
  /**
   * 레슨 추가/편집 editor(modal 등) — manager 가 open 상태를 소유, 내용은 wrapper.
   * `lesson` 이 null 이면 신규. `close()` 로 닫는다(저장 후 reload 등은 wrapper 책임).
   */
  renderEditor: (args: { lesson: InstructorLessonListItem | null; close: () => void }) => React.ReactNode;
  /** 타입 라벨 맵 (예: { video:'동영상', article:'문서', quiz:'퀴즈', assignment:'과제' }) */
  lessonTypeLabel?: Record<string, string>;
  /** 강조색 (drag-over 테두리 등). 기본 #4f46e5 */
  accent?: string;
  /** 섹션 제목 (기본 '레슨 목록') */
  title?: string;
  /** 제목 우측 슬롯 (예: KPA 'AI로 강의 구조 만들기' 버튼). manager 는 내용을 알지 못함. */
  headerExtra?: React.ReactNode;
  emptyTitle?: string;
  emptyDesc?: string;
  /** 하단 추가 버튼 라벨 (기본 '+ 새 레슨 추가') */
  addLabel?: string;
  /** empty 상태 추가 버튼 라벨 (기본 '+ 레슨 추가') */
  emptyAddLabel?: string;
}

const s: Record<string, React.CSSProperties> = {
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8,
    borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  lessonCard: {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '12px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  dragHandle: { cursor: 'grab', color: '#9ca3af', fontSize: 16, userSelect: 'none', paddingRight: 4 },
  lessonOrder: { fontSize: 12, fontWeight: 700, color: '#6b7280', minWidth: 24, paddingTop: 3 },
  lessonBody: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 },
  lessonMeta: { fontSize: 12, color: '#9ca3af' },
  lessonActions: { display: 'flex', gap: 6 },
  editSmBtn: { padding: '4px 10px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  delSmBtn: { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  addLessonBtn: { padding: '9px 18px', background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer', width: '100%' },
  emptyState: { textAlign: 'center', padding: '48px 20px', color: '#6b7280' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
};

function defaultMeta(lesson: InstructorLessonListItem, typeLabel?: Record<string, string>): string {
  const label = typeLabel?.[lesson.type] ?? lesson.type;
  const dur = lesson.duration && lesson.duration > 0 ? `${lesson.duration}분` : '시간 미설정';
  return `${label} · ${dur}`;
}

export const InstructorLessonListManager = forwardRef<InstructorLessonListHandle, InstructorLessonListManagerProps>(
  function InstructorLessonListManager(
    {
      lessons,
      onReorder,
      onDelete,
      renderEditor,
      lessonTypeLabel,
      accent = '#4f46e5',
      title = '레슨 목록',
      headerExtra,
      emptyTitle = '아직 강의 내용이 없습니다',
      emptyDesc = '첫 번째 레슨을 추가하여 강의를 구성하세요',
      addLabel = '+ 새 레슨 추가',
      emptyAddLabel = '+ 레슨 추가',
    },
    ref,
  ) {
    const [editing, setEditing] = useState<{ open: boolean; lesson: InstructorLessonListItem | null }>({ open: false, lesson: null });
    const dragIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const openAdd = () => setEditing({ open: true, lesson: null });
    const openEdit = (lesson: InstructorLessonListItem) => setEditing({ open: true, lesson });
    const close = () => setEditing({ open: false, lesson: null });

    useImperativeHandle(ref, () => ({ openAdd }), []);

    const dragEnabled = !!onReorder;

    const handleDragStart = (index: number) => { dragIndexRef.current = index; };
    const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
    const handleDragLeave = () => { setDragOverIndex(null); };
    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const dragIndex = dragIndexRef.current;
      dragIndexRef.current = null;
      if (dragIndex === null || dragIndex === dropIndex || !onReorder) return;
      const reordered = [...lessons];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      await onReorder(reordered);
    };
    const handleDragEnd = () => { dragIndexRef.current = null; setDragOverIndex(null); };

    return (
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span>{title} ({lessons.length})</span>
          {headerExtra}
        </div>

        {lessons.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📝</div>
            <div style={s.emptyTitle}>{emptyTitle}</div>
            <div style={s.emptyDesc}>{emptyDesc}</div>
            <button type="button" style={s.addLessonBtn} onClick={openAdd}>{emptyAddLabel}</button>
          </div>
        ) : (
          <>
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                style={{
                  ...s.lessonCard,
                  ...(dragOverIndex === index ? { borderColor: accent, background: '#f5f3ff' } : {}),
                }}
                draggable={dragEnabled}
                onDragStart={dragEnabled ? () => handleDragStart(index) : undefined}
                onDragOver={dragEnabled ? (e) => handleDragOver(e, index) : undefined}
                onDragLeave={dragEnabled ? handleDragLeave : undefined}
                onDrop={dragEnabled ? (e) => handleDrop(e, index) : undefined}
                onDragEnd={dragEnabled ? handleDragEnd : undefined}
              >
                {dragEnabled && <span style={s.dragHandle} title="드래그하여 순서 변경">⠿</span>}
                <div style={s.lessonOrder}>{index + 1}</div>
                <div style={s.lessonBody}>
                  <div style={s.lessonTitle}>{lesson.title}</div>
                  <div style={s.lessonMeta}>{defaultMeta(lesson, lessonTypeLabel)}</div>
                </div>
                <div style={s.lessonActions}>
                  <button type="button" style={s.editSmBtn} onClick={() => openEdit(lesson)}>편집</button>
                  {onDelete && (
                    <button type="button" style={s.delSmBtn} onClick={() => onDelete(lesson)}>삭제</button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" style={s.addLessonBtn} onClick={openAdd}>{addLabel}</button>
          </>
        )}

        {editing.open && renderEditor({ lesson: editing.lesson, close })}
      </div>
    );
  },
);

export default InstructorLessonListManager;
