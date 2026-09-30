/**
 * 비밀번호 규칙 안내 — 입력 중 항목별 충족 여부 + 확인 입력 일치 여부
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (규칙 정본: @o4o/auth-utils `checkPasswordPolicy`)
 */
import { checkPasswordPolicy, PASSWORD_POLICY_MESSAGES, type PasswordViolation } from '@o4o/auth-utils';
import { styles } from './shared';

const ORDER: PasswordViolation[] = ['too_short', 'too_long', 'no_letter', 'no_digit', 'no_symbol'];
const LABEL: Record<PasswordViolation, string> = {
  too_short: '8자 이상',
  too_long: '72바이트 이하',
  no_letter: '영문자 포함',
  no_digit: '숫자 포함',
  no_symbol: '특수기호 포함',
};

export function PasswordPolicyHints({ id, password, confirm }: { id?: string; password: string; confirm?: string }) {
  const violations = new Set(checkPasswordPolicy(password));
  const touched = password.length > 0;
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }} data-testid="password-policy-hints">
      <p style={styles.hint}>8자 이상 · 영문자 · 숫자 · 특수기호를 각각 1개 이상 (대소문자 구분 요구 없음) · 최대 72바이트(영문 72자 · 한글 24자)</p>
      {touched && (
        <p style={{ margin: 0, fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ORDER.map((v) => (
            <span key={v} style={violations.has(v) ? styles.hintBad : styles.hintOk} title={PASSWORD_POLICY_MESSAGES[v]}>
              {violations.has(v) ? '✕' : '✓'} {LABEL[v]}
            </span>
          ))}
        </p>
      )}
      {confirm !== undefined && confirm.length > 0 && (
        <p style={confirm === password ? styles.hintOk : styles.hintBad} data-testid="password-confirm-hint">
          {confirm === password ? '✓ 비밀번호가 일치합니다.' : '✕ 비밀번호가 일치하지 않습니다.'}
        </p>
      )}
    </div>
  );
}
