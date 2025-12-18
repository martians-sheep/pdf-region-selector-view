import { useState, useCallback } from 'react';

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  const [inputValue, setInputValue] = useState(String(currentPage));

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputValue(String(currentPage));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Sync input value when currentPage changes externally
  if (inputValue !== String(currentPage) && document.activeElement?.tagName !== 'INPUT') {
    setInputValue(String(currentPage));
  }

  return (
    <div style={styles.container}>
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        style={{
          ...styles.button,
          ...(currentPage <= 1 ? styles.buttonDisabled : {}),
        }}
      >
        Prev
      </button>
      <div style={styles.pageInfo}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          style={styles.input}
        />
        <span style={styles.separator}>/</span>
        <span>{totalPages}</span>
      </div>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        style={{
          ...styles.button,
          ...(currentPage >= totalPages ? styles.buttonDisabled : {}),
        }}
      >
        Next
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  buttonDisabled: {
    background: '#999',
    cursor: 'not-allowed',
  },
  pageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
  },
  input: {
    width: '40px',
    textAlign: 'center',
    padding: '4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  separator: {
    color: '#666',
  },
};
