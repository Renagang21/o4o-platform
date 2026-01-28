/**
 * ProgramsSection - 참여 프로그램 목록
 *
 * WO-PHARMACY-DASHBOARD-FRAME-V1
 *
 * MVP: 빈 상태(empty state) 표시. 실제 프로그램 데이터는 후속 WO.
 */

export function ProgramsSection() {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        참여 프로그램
      </h2>

      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #e2e8f0',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
        <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#64748b', fontWeight: 500 }}>
          참여 중인 프로그램이 없습니다
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
          약사회에서 제공하는 프로그램에 참여해 보세요
        </p>
      </div>
    </section>
  );
}
