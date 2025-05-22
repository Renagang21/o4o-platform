import React from 'react';

const ThemeToggle: React.FC = () => {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return (
    <button
      className="btn btn-sm btn-ghost"
      aria-label="다크모드 토글"
      onClick={() => setDark((d) => !d)}
    >
      {dark ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle; 