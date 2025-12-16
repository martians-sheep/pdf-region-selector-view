import { useState, useRef, useCallback, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { PdfSelection, DomRect } from '../types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

type Props = {
  url: string;
  scale: number;
  selections: PdfSelection[];
  onSelectionCreate: (selection: PdfSelection) => void;
};

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

const MIN_SELECTION_SIZE = 3; // px

export default function PdfViewer({ url, scale, selections, onSelectionCreate }: Props) {
  const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Get viewport for current scale
  const viewport = useMemo(() => {
    if (!pageProxy) return null;
    return pageProxy.getViewport({ scale });
  }, [pageProxy, scale]);

  // Get page dimensions in PDF points
  const pageDimensions = useMemo(() => {
    if (!pageProxy) return null;
    const vp = pageProxy.getViewport({ scale: 1 });
    return { width: vp.width, height: vp.height };
  }, [pageProxy]);

  const handlePageLoadSuccess = useCallback((page: PDFPageProxy) => {
    setPageProxy(page);
  }, []);

  // Calculate DOM rect from drag state
  const getDomRectFromDrag = useCallback((drag: DragState): DomRect => {
    const left = Math.min(drag.startX, drag.currentX);
    const top = Math.min(drag.startY, drag.currentY);
    const width = Math.abs(drag.currentX - drag.startX);
    const height = Math.abs(drag.currentY - drag.startY);
    return { left, top, width, height };
  }, []);

  // Convert DOM coordinates to PDF coordinates
  const convertDomToPdf = useCallback(
    (domRect: DomRect): { x: number; y: number; width: number; height: number } | null => {
      if (!viewport) return null;

      // Convert top-left and bottom-right corners to PDF points
      const topLeftPdf = viewport.convertToPdfPoint(domRect.left, domRect.top);
      const bottomRightPdf = viewport.convertToPdfPoint(
        domRect.left + domRect.width,
        domRect.top + domRect.height
      );

      // Normalize using min/max (PDF y-axis may be flipped)
      const x = Math.min(topLeftPdf[0], bottomRightPdf[0]);
      const y = Math.min(topLeftPdf[1], bottomRightPdf[1]);
      const width = Math.abs(bottomRightPdf[0] - topLeftPdf[0]);
      const height = Math.abs(bottomRightPdf[1] - topLeftPdf[1]);

      return { x, y, width, height };
    },
    [viewport]
  );

  // Convert PDF coordinates to DOM coordinates for display
  const convertPdfToDom = useCallback(
    (selection: PdfSelection): DomRect | null => {
      if (!viewport) return null;

      // Convert PDF points to viewport (DOM) coordinates
      const topLeft = viewport.convertToViewportPoint(selection.x, selection.y);
      const bottomRight = viewport.convertToViewportPoint(
        selection.x + selection.width,
        selection.y + selection.height
      );

      // Normalize
      const left = Math.min(topLeft[0], bottomRight[0]);
      const top = Math.min(topLeft[1], bottomRight[1]);
      const width = Math.abs(bottomRight[0] - topLeft[0]);
      const height = Math.abs(bottomRight[1] - topLeft[1]);

      return { left, top, width, height };
    },
    [viewport]
  );

  // Get local coordinates relative to overlay
  const getLocalCoords = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      if (!overlayRef.current) return null;
      const rect = overlayRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // Clamp coordinates to overlay bounds
  const clampCoords = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      if (!viewport) return { x, y };
      return {
        x: Math.max(0, Math.min(x, viewport.width)),
        y: Math.max(0, Math.min(y, viewport.height)),
      };
    },
    [viewport]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Only left click
      const coords = getLocalCoords(e);
      if (!coords) return;

      const clamped = clampCoords(coords.x, coords.y);
      setIsDragging(true);
      setDragState({
        startX: clamped.x,
        startY: clamped.y,
        currentX: clamped.x,
        currentY: clamped.y,
      });

      // Capture pointer for drag tracking outside overlay
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getLocalCoords, clampCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragState) return;

      const coords = getLocalCoords(e);
      if (!coords) return;

      const clamped = clampCoords(coords.x, coords.y);
      setDragState((prev) =>
        prev ? { ...prev, currentX: clamped.x, currentY: clamped.y } : null
      );
    },
    [isDragging, dragState, getLocalCoords, clampCoords]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragState) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const domRect = getDomRectFromDrag(dragState);

      // Check minimum size
      if (domRect.width < MIN_SELECTION_SIZE || domRect.height < MIN_SELECTION_SIZE) {
        setIsDragging(false);
        setDragState(null);
        return;
      }

      // Convert to PDF coordinates
      const pdfCoords = convertDomToPdf(domRect);
      if (!pdfCoords || !pageDimensions) {
        setIsDragging(false);
        setDragState(null);
        return;
      }

      // Create selection
      const selection: PdfSelection = {
        id: crypto.randomUUID(),
        pageNumber: 1,
        x: pdfCoords.x,
        y: pdfCoords.y,
        width: pdfCoords.width,
        height: pdfCoords.height,
        pageWidth: pageDimensions.width,
        pageHeight: pageDimensions.height,
        createdAt: new Date().toISOString(),
      };

      onSelectionCreate(selection);
      setIsDragging(false);
      setDragState(null);
    },
    [isDragging, dragState, getDomRectFromDrag, convertDomToPdf, pageDimensions, onSelectionCreate]
  );

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
    setDragState(null);
  }, []);

  // Current drag preview rect
  const dragPreviewRect = dragState ? getDomRectFromDrag(dragState) : null;

  return (
    <Document file={url} loading={<div>Loading PDF...</div>}>
      <div style={styles.wrapper}>
        <Page
          pageNumber={1}
          scale={scale}
          onLoadSuccess={handlePageLoadSuccess}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
        {/* Overlay - must match Page dimensions exactly */}
        <div
          ref={overlayRef}
          style={styles.overlay}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Existing selections */}
          {selections.map((sel) => {
            const domRect = convertPdfToDom(sel);
            if (!domRect) return null;
            return (
              <div
                key={sel.id}
                style={{
                  ...styles.selection,
                  left: domRect.left,
                  top: domRect.top,
                  width: domRect.width,
                  height: domRect.height,
                }}
              />
            );
          })}

          {/* Drag preview */}
          {isDragging && dragPreviewRect && (
            <div
              style={{
                ...styles.dragPreview,
                left: dragPreviewRect.left,
                top: dragPreviewRect.top,
                width: dragPreviewRect.width,
                height: dragPreviewRect.height,
              }}
            />
          )}
        </div>
      </div>
    </Document>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    touchAction: 'none',
    cursor: 'crosshair',
  },
  selection: {
    position: 'absolute',
    border: '2px solid #2196F3',
    background: 'rgba(33, 150, 243, 0.2)',
    pointerEvents: 'none',
  },
  dragPreview: {
    position: 'absolute',
    border: '2px dashed #F44336',
    background: 'rgba(244, 67, 54, 0.1)',
    pointerEvents: 'none',
  },
};
