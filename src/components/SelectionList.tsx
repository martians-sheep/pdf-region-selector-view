import { useCallback } from 'react';
import type { PdfSelection } from '../types';

type Props = {
  selections: PdfSelection[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
};

export default function SelectionList({ selections, onDelete, onClearAll }: Props) {
  const handleCopyJson = useCallback(async () => {
    const json = JSON.stringify(selections, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert('JSONをクリップボードにコピーしました');
    } catch {
      alert('コピーに失敗しました');
    }
  }, [selections]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>選択領域一覧</h2>
        <span style={styles.count}>{selections.length}件</span>
      </div>

      <div style={styles.actions}>
        <button onClick={handleCopyJson} style={styles.button} disabled={selections.length === 0}>
          JSONをコピー
        </button>
        <button
          onClick={onClearAll}
          style={{ ...styles.button, ...styles.dangerButton }}
          disabled={selections.length === 0}
        >
          全削除
        </button>
      </div>

      {selections.length > 0 && (
        <ul style={styles.list}>
          {selections.map((sel, index) => (
            <li key={sel.id} style={styles.listItem}>
              <div style={styles.itemHeader}>
                <span style={styles.itemIndex}>#{index + 1}</span>
                <button
                  onClick={() => onDelete(sel.id)}
                  style={styles.deleteButton}
                  title="削除"
                >
                  ×
                </button>
              </div>
              <div style={styles.coords}>
                <div>
                  <strong>位置:</strong> x={sel.x.toFixed(2)}, y={sel.y.toFixed(2)}
                </div>
                <div>
                  <strong>サイズ:</strong> {sel.width.toFixed(2)} × {sel.height.toFixed(2)}
                </div>
                <div style={styles.meta}>
                  ページ: {sel.pageNumber} ({sel.pageWidth.toFixed(0)} × {sel.pageHeight.toFixed(0)} pt)
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={styles.jsonSection}>
        <h3 style={styles.jsonTitle}>JSON出力</h3>
        <pre style={styles.jsonPre}>
          {selections.length > 0
            ? JSON.stringify(selections, null, 2)
            : '// 領域を選択するとここにJSONが表示されます'}
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
  dangerButton: {
    borderColor: '#f44336',
    color: '#f44336',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  itemIndex: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  deleteButton: {
    border: 'none',
    background: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px',
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
