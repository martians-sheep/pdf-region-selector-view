import { useState, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import PdfViewer from './components/PdfViewer';
import SelectionList from './components/SelectionList';
import type { PdfSelection } from './types';

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [selections, setSelections] = useState<PdfSelection[]>([]);
  const [scale, setScale] = useState<number>(1.0);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setSelections([]);
    }
  }, []);

  const handleSelectionCreate = useCallback((selection: PdfSelection) => {
    setSelections((prev) => [...prev, selection]);
  }, []);

  const handleDeleteSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSelectionUpdate = useCallback((updated: PdfSelection) => {
    setSelections((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setSelections([]);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>PDF Region Selector</h1>
        <div style={styles.toolbar}>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
          <div style={styles.zoomControls}>
            <button onClick={handleZoomOut} style={styles.button}>
              - Zoom Out
            </button>
            <span style={styles.scaleDisplay}>{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} style={styles.button}>
              + Zoom In
            </button>
            <button onClick={handleResetZoom} style={styles.button}>
              Reset
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.viewerSection}>
          {pdfUrl ? (
            <PdfViewer
              url={pdfUrl}
              scale={scale}
              selections={selections}
              onSelectionCreate={handleSelectionCreate}
              onSelectionUpdate={handleSelectionUpdate}
            />
          ) : (
            <div style={styles.placeholder}>
              PDFファイルを選択してください
            </div>
          )}
        </div>

        <aside style={styles.sidebar}>
          <SelectionList
            selections={selections}
            onDelete={handleDeleteSelection}
            onClearAll={handleClearAll}
          />
        </aside>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px',
    background: '#fff',
    borderBottom: '1px solid #ddd',
  },
  title: {
    fontSize: '20px',
    marginBottom: '12px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  fileInput: {
    padding: '4px',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: '4px',
  },
  scaleDisplay: {
    minWidth: '60px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  main: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '16px',
    overflow: 'hidden',
  },
  viewerSection: {
    flex: 1,
    overflow: 'auto',
    background: '#eee',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '16px',
    height: '400px',
  },
  sidebar: {
    width: '400px',
    flexShrink: 0,
    overflow: 'auto',
  },
};

export default App;
