interface CTASectionProps {
  buttonText: string;
  buttonType: 'explore' | 'login';
  onButtonClick?: () => void;
}

export function CTASection({ buttonText, buttonType, onButtonClick }: CTASectionProps) {
  const handleClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (buttonType === 'login') {
      // Mock: 실제 로그인 페이지로 이동
      console.log('Navigate to login');
    } else {
      // Mock: 서비스 둘러보기
      console.log('Navigate to explore');
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <button style={styles.button} onClick={handleClick}>
          {buttonText}
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '48px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e9ecef',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
  },
  button: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
