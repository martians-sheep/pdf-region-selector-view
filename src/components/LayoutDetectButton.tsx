import type { DetectionProgress } from '../types';

type Props = {
  onDetect: () => void;
  onClear: () => void;
  progress: DetectionProgress;
  disabled: boolean;
};

export default function LayoutDetectButton({
  onDetect,
  onClear,
  progress,
  disabled,
}: Props) {
  const { status, totalPages, processedPages, currentPage, error } = progress;

  if (status === 'processing') {
    const percent = totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0;
    return (
      <div style={styles.container}>
        <div style={styles.progressText}>
          Processing page {currentPage} of {totalPages}...
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.errorText}>{error || 'Error occurred'}</div>
        <button onClick={onDetect} disabled={disabled} style={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div style={styles.container}>
        <button onClick={onDetect} disabled={disabled} style={styles.button}>
          Re-detect
        </button>
        <button onClick={onClear} style={styles.clearButton}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <button onClick={onDetect} disabled={disabled} style={styles.button}>
      Detect Layout
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  clearButton: {
    padding: '8px 16px',
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  progressText: {
    fontSize: '12px',
    color: '#666',
  },
  progressBar: {
    width: '120px',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#4CAF50',
    transition: 'width 0.2s',
  },
  errorText: {
    fontSize: '12px',
    color: '#f44336',
  },
};
