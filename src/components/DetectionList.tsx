import { useCallback } from 'react';
import type { PdfDetection, DetectionLabel } from '../types';

type Props = {
  detections: PdfDetection[];
  currentPage?: number;
  scoreThreshold: number;
  onScoreThresholdChange: (threshold: number) => void;
};

const LABEL_COLORS: Record<DetectionLabel, string> = {
  Text: '#4CAF50',
  Title: '#2196F3',
  List: '#00BCD4',
  Table: '#9C27B0',
  Figure: '#FF9800',
};

export default function DetectionList({
  detections,
  currentPage,
  scoreThreshold,
  onScoreThresholdChange,
}: Props) {
  const filteredDetections = detections.filter((d) => {
    const passesScore = d.score >= scoreThreshold;
    const passesPage = currentPage === undefined || d.pageNumber === currentPage;
    return passesScore && passesPage;
  });

  const handleCopyJson = useCallback(async () => {
    const json = JSON.stringify(filteredDetections, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert('JSONをクリップボードにコピーしました');
    } catch {
      alert('コピーに失敗しました');
    }
  }, [filteredDetections]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>検出結果</h2>
        <span style={styles.count}>{filteredDetections.length}件</span>
      </div>

      <div style={styles.thresholdSection}>
        <label style={styles.thresholdLabel}>
          Score閾値: {(scoreThreshold * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={scoreThreshold * 100}
          onChange={(e) => onScoreThresholdChange(Number(e.target.value) / 100)}
          style={styles.slider}
        />
      </div>

      <div style={styles.actions}>
        <button
          onClick={handleCopyJson}
          style={styles.button}
          disabled={filteredDetections.length === 0}
        >
          JSONをコピー
        </button>
      </div>

      {filteredDetections.length > 0 && (
        <ul style={styles.list}>
          {filteredDetections.map((det, index) => (
            <li key={det.id} style={styles.listItem}>
              <div style={styles.itemHeader}>
                <span style={styles.itemIndex}>#{index + 1}</span>
                <span
                  style={{
                    ...styles.labelBadge,
                    background: LABEL_COLORS[det.label],
                  }}
                >
                  {det.label}
                </span>
                <span style={styles.score}>{(det.score * 100).toFixed(0)}%</span>
              </div>
              <div style={styles.coords}>
                <div>
                  <strong>位置:</strong> x={det.x.toFixed(2)}, y={det.y.toFixed(2)}
                </div>
                <div>
                  <strong>サイズ:</strong> {det.width.toFixed(2)} × {det.height.toFixed(2)}
                </div>
                <div style={styles.meta}>ページ: {det.pageNumber}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={styles.jsonSection}>
        <h3 style={styles.jsonTitle}>JSON出力</h3>
        <pre style={styles.jsonPre}>
          {filteredDetections.length > 0
            ? JSON.stringify(filteredDetections, null, 2)
            : '// 検出結果がありません'}
        </pre>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: '4px',
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '16px',
    margin: 0,
  },
  count: {
    fontSize: '14px',
    color: '#666',
  },
  thresholdSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  thresholdLabel: {
    fontSize: '12px',
    color: '#666',
  },
  slider: {
    width: '100%',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: '4px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  listItem: {
    padding: '8px',
    background: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '12px',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  itemIndex: {
    fontWeight: 'bold',
    color: '#666',
  },
  labelBadge: {
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  score: {
    marginLeft: 'auto',
    color: '#888',
    fontSize: '11px',
  },
  coords: {
    lineHeight: 1.6,
  },
  meta: {
    color: '#888',
    fontSize: '11px',
  },
  jsonSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  jsonTitle: {
    fontSize: '14px',
    margin: '0 0 8px 0',
  },
  jsonPre: {
    flex: 1,
    margin: 0,
    padding: '12px',
    background: '#1e1e1e',
    color: '#d4d4d4',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};
