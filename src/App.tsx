import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import PdfViewer from './components/PdfViewer';
import SelectionList from './components/SelectionList';
import PageNavigation from './components/PageNavigation';
import LayoutDetectButton from './components/LayoutDetectButton';
import DetectionList from './components/DetectionList';
import { useLayoutDetection } from './hooks/useLayoutDetection';
import { getPdfPageCount } from './utils/pdfToImage';
import { createBoundingBoxFromDetections } from './utils/boundingBox';
import type { PdfSelection } from './types';

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [selections, setSelections] = useState<PdfSelection[]>([]);
  const [scale, setScale] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scoreThreshold, setScoreThreshold] = useState<number>(0.5);
  const [showDetections, setShowDetections] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'selections' | 'detections'>('selections');
  const [autoCreateBoundingBox, setAutoCreateBoundingBox] = useState<boolean>(true);
  const autoCreatedPagesRef = useRef<Set<number>>(new Set());

  const { detections, progress, startDetection, clearDetections, isProcessing } =
    useLayoutDetection();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setSelections([]);
      setCurrentPage(1);
      clearDetections();
      autoCreatedPagesRef.current = new Set();

      try {
        const pages = await getPdfPageCount(url);
        setTotalPages(pages);
      } catch {
        setTotalPages(1);
      }
    }
  }, [clearDetections]);

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

  const handleDetectLayout = useCallback(async () => {
    if (!pdfUrl) return;
    autoCreatedPagesRef.current = new Set();
    await startDetection(pdfUrl);
  }, [pdfUrl, startDetection]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleCreateBoundingBox = useCallback(() => {
    const pageDetections = detections.filter(
      (d) => d.pageNumber === currentPage && d.score >= scoreThreshold
    );
    const boundingBox = createBoundingBoxFromDetections(pageDetections, currentPage);
    if (boundingBox) {
      setSelections((prev) => [...prev, boundingBox]);
    }
  }, [detections, currentPage, scoreThreshold]);

  // Auto-create bounding box when page detection completes
  useEffect(() => {
    if (!autoCreateBoundingBox || progress.status !== 'processing') {
      return;
    }

    const processedPage = progress.processedPages;
    if (processedPage === 0 || autoCreatedPagesRef.current.has(processedPage)) {
      return;
    }

    const pageDetections = detections.filter(
      (d) => d.pageNumber === processedPage && d.score >= scoreThreshold
    );

    if (pageDetections.length > 0) {
      const boundingBox = createBoundingBoxFromDetections(pageDetections, processedPage);
      if (boundingBox) {
        setSelections((prev) => [...prev, boundingBox]);
        autoCreatedPagesRef.current.add(processedPage);
      }
    }
  }, [autoCreateBoundingBox, progress.processedPages, progress.status, detections, scoreThreshold]);

  const currentPageDetections = detections.filter((d) => d.pageNumber === currentPage);
  const currentPageSelections = selections.filter((s) => s.pageNumber === currentPage);

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

          {pdfUrl && totalPages > 1 && (
            <PageNavigation
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}

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

          {pdfUrl && (
            <>
              <LayoutDetectButton
                onDetect={handleDetectLayout}
                onClear={clearDetections}
                progress={progress}
                disabled={!pdfUrl || isProcessing}
              />
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={autoCreateBoundingBox}
                  onChange={(e) => setAutoCreateBoundingBox(e.target.checked)}
                />
                自動で本文領域作成
              </label>
            </>
          )}

          {detections.length > 0 && (
            <>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showDetections}
                  onChange={(e) => setShowDetections(e.target.checked)}
                />
                Show Detections
              </label>
              <button
                onClick={handleCreateBoundingBox}
                style={styles.boundingBoxButton}
                disabled={currentPageDetections.length === 0}
              >
                本文領域を作成
              </button>
            </>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.viewerSection}>
          {pdfUrl ? (
            <PdfViewer
              url={pdfUrl}
              scale={scale}
              selections={currentPageSelections}
              detections={showDetections ? currentPageDetections : []}
              currentPage={currentPage}
              scoreThreshold={scoreThreshold}
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
          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab('selections')}
              style={{
                ...styles.tab,
                ...(activeTab === 'selections' ? styles.activeTab : {}),
              }}
            >
              選択領域
            </button>
            <button
              onClick={() => setActiveTab('detections')}
              style={{
                ...styles.tab,
                ...(activeTab === 'detections' ? styles.activeTab : {}),
              }}
            >
              検出結果
            </button>
          </div>

          {activeTab === 'selections' ? (
            <SelectionList
              selections={selections}
              onDelete={handleDeleteSelection}
              onClearAll={handleClearAll}
            />
          ) : (
            <DetectionList
              detections={detections}
              currentPage={currentPage}
              scoreThreshold={scoreThreshold}
              onScoreThresholdChange={setScoreThreshold}
            />
          )}
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  boundingBoxButton: {
    padding: '8px 16px',
    background: '#FF9800',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
    display: 'flex',
    flexDirection: 'column',
  },
  tabs: {
    display: 'flex',
    marginBottom: '8px',
  },
  tab: {
    flex: 1,
    padding: '8px 16px',
    border: '1px solid #ccc',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '14px',
  },
  activeTab: {
    background: '#fff',
    borderBottom: '1px solid #fff',
    fontWeight: 'bold',
  },
};

export default App;
