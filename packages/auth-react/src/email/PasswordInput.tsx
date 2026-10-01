/**
 * <PasswordInput /> — 로그인 비밀번호 입력의 **유일한** 공통 컴포넌트
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * 보기/숨기기 토글을 포함한다. 서비스 화면은 이 컴포넌트를 쓰고 직접 password 입력을 만들지 않는다 —
 * `legacy-password-auth-retirement.spec` P4 가 이 파일 한 곳만 허용한다.
 * 값은 부모 상태에만 있다(저장소·로그에 두지 않는다). 대소문자·공백을 변형하지 않는다.
 */
import { useId, useState } from 'react';
import { styles } from './shared';

export interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 'current-password'(로그인) | 'new-password'(가입·재설정) */
  autoComplete: 'current-password' | 'new-password';
  invalid?: boolean;
  /** 입력칸 아래 설명 id(aria-describedby) */
  describedBy?: string;
  name?: string;
  disabled?: boolean;
  testId?: string;
}

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
  name,
  disabled,
  testId,
}: PasswordInputProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div style={styles.field}>
      <label htmlFor={id} style={styles.label}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-testid={testId}
          style={{ ...styles.input, paddingRight: 64, ...(invalid ? styles.inputInvalid : null) }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          aria-pressed={visible}
          disabled={disabled}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            padding: '4px 8px', border: 'none', background: 'transparent', color: '#4b5563',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          {visible ? '숨기기' : '보기'}
        </button>
      </div>
    </div>
  );
}
