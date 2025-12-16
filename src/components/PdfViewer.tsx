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
  onSelectionUpdate: (selection: PdfSelection) => void;
};

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

// Interaction mode types
type InteractionMode = 'none' | 'creating' | 'moving' | 'resizing';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_SELECTION_SIZE = 3; // px
const HANDLE_SIZE = 8; // px

export default function PdfViewer({ url, scale, selections, onSelectionCreate, onSelectionUpdate }: Props) {
  const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(null);
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

  // Find selection at point
  const findSelectionAtPoint = useCallback(
    (x: number, y: number): string | null => {
      for (let i = selections.length - 1; i >= 0; i--) {
        const sel = selections[i];
        const domRect = convertPdfToDom(sel);
        if (!domRect) continue;

        if (
          x >= domRect.left &&
          x <= domRect.left + domRect.width &&
          y >= domRect.top &&
          y <= domRect.top + domRect.height
        ) {
          return sel.id;
        }
      }
      return null;
    },
    [selections, convertPdfToDom]
  );

  // Get resize handle at point for a selection
  const getResizeHandleAtPoint = useCallback(
    (x: number, y: number, selectionId: string): ResizeHandle | null => {
      const selection = selections.find((s) => s.id === selectionId);
      if (!selection) return null;

      const domRect = convertPdfToDom(selection);
      if (!domRect) return null;

      const halfHandle = HANDLE_SIZE / 2;
      const { left, top, width, height } = domRect;
      const right = left + width;
      const bottom = top + height;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Check corners first (they have priority)
      // NW
      if (Math.abs(x - left) <= halfHandle && Math.abs(y - top) <= halfHandle) return 'nw';
      // NE
      if (Math.abs(x - right) <= halfHandle && Math.abs(y - top) <= halfHandle) return 'ne';
      // SW
      if (Math.abs(x - left) <= halfHandle && Math.abs(y - bottom) <= halfHandle) return 'sw';
      // SE
      if (Math.abs(x - right) <= halfHandle && Math.abs(y - bottom) <= halfHandle) return 'se';

      // Check edges
      // N
      if (Math.abs(x - centerX) <= halfHandle && Math.abs(y - top) <= halfHandle) return 'n';
      // S
      if (Math.abs(x - centerX) <= halfHandle && Math.abs(y - bottom) <= halfHandle) return 's';
      // W
      if (Math.abs(x - left) <= halfHandle && Math.abs(y - centerY) <= halfHandle) return 'w';
      // E
      if (Math.abs(x - right) <= halfHandle && Math.abs(y - centerY) <= halfHandle) return 'e';

      return null;
    },
    [selections, convertPdfToDom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Only left click
      const coords = getLocalCoords(e);
      if (!coords) return;

      const clamped = clampCoords(coords.x, coords.y);

      // Check if clicking on a resize handle of selected item
      if (selectedId) {
        const handle = getResizeHandleAtPoint(clamped.x, clamped.y, selectedId);
        if (handle) {
          setInteractionMode('resizing');
          setActiveHandle(handle);
          setDragState({
            startX: clamped.x,
            startY: clamped.y,
            currentX: clamped.x,
            currentY: clamped.y,
          });
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }

      // Check if clicking on an existing selection
      const clickedId = findSelectionAtPoint(clamped.x, clamped.y);
      if (clickedId) {
        const selection = selections.find((s) => s.id === clickedId);
        if (selection) {
          const domRect = convertPdfToDom(selection);
          if (domRect) {
            setSelectedId(clickedId);
            setInteractionMode('moving');
            setMoveOffset({
              x: clamped.x - domRect.left,
              y: clamped.y - domRect.top,
            });
            setDragState({
              startX: clamped.x,
              startY: clamped.y,
              currentX: clamped.x,
              currentY: clamped.y,
            });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // Start creating a new selection
      setSelectedId(null);
      setInteractionMode('creating');
      setDragState({
        startX: clamped.x,
        startY: clamped.y,
        currentX: clamped.x,
        currentY: clamped.y,
      });

      // Capture pointer for drag tracking outside overlay
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getLocalCoords, clampCoords, selectedId, getResizeHandleAtPoint, findSelectionAtPoint, selections, convertPdfToDom]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (interactionMode === 'none' || !dragState) return;

      const coords = getLocalCoords(e);
      if (!coords) return;

      const clamped = clampCoords(coords.x, coords.y);
      setDragState((prev) =>
        prev ? { ...prev, currentX: clamped.x, currentY: clamped.y } : null
      );
    },
    [interactionMode, dragState, getLocalCoords, clampCoords]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (interactionMode === 'none' || !dragState) return;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (interactionMode === 'creating') {
        const domRect = getDomRectFromDrag(dragState);

        // Check minimum size
        if (domRect.width < MIN_SELECTION_SIZE || domRect.height < MIN_SELECTION_SIZE) {
          setInteractionMode('none');
          setDragState(null);
          return;
        }

        // Convert to PDF coordinates
        const pdfCoords = convertDomToPdf(domRect);
        if (!pdfCoords || !pageDimensions) {
          setInteractionMode('none');
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
        setSelectedId(selection.id);
      } else if (interactionMode === 'moving' && selectedId && moveOffset) {
        const selection = selections.find((s) => s.id === selectedId);
        if (selection && viewport) {
          const domRect = convertPdfToDom(selection);
          if (domRect) {
            const newLeft = dragState.currentX - moveOffset.x;
            const newTop = dragState.currentY - moveOffset.y;

            // Clamp to viewport bounds
            const clampedLeft = Math.max(0, Math.min(newLeft, viewport.width - domRect.width));
            const clampedTop = Math.max(0, Math.min(newTop, viewport.height - domRect.height));

            const newDomRect: DomRect = {
              left: clampedLeft,
              top: clampedTop,
              width: domRect.width,
              height: domRect.height,
            };

            const pdfCoords = convertDomToPdf(newDomRect);
            if (pdfCoords) {
              onSelectionUpdate({
                ...selection,
                x: pdfCoords.x,
                y: pdfCoords.y,
              });
            }
          }
        }
      } else if (interactionMode === 'resizing' && selectedId && activeHandle) {
        const selection = selections.find((s) => s.id === selectedId);
        if (selection && viewport) {
          const domRect = convertPdfToDom(selection);
          if (domRect) {
            let { left, top, width, height } = domRect;
            const dx = dragState.currentX - dragState.startX;
            const dy = dragState.currentY - dragState.startY;

            // Apply resize based on handle
            switch (activeHandle) {
              case 'n':
                top += dy;
                height -= dy;
                break;
              case 's':
                height += dy;
                break;
              case 'w':
                left += dx;
                width -= dx;
                break;
              case 'e':
                width += dx;
                break;
              case 'nw':
                left += dx;
                width -= dx;
                top += dy;
                height -= dy;
                break;
              case 'ne':
                width += dx;
                top += dy;
                height -= dy;
                break;
              case 'sw':
                left += dx;
                width -= dx;
                height += dy;
                break;
              case 'se':
                width += dx;
                height += dy;
                break;
            }

            // Ensure minimum size
            if (width < MIN_SELECTION_SIZE) {
              if (activeHandle.includes('w')) {
                left = domRect.left + domRect.width - MIN_SELECTION_SIZE;
              }
              width = MIN_SELECTION_SIZE;
            }
            if (height < MIN_SELECTION_SIZE) {
              if (activeHandle.includes('n')) {
                top = domRect.top + domRect.height - MIN_SELECTION_SIZE;
              }
              height = MIN_SELECTION_SIZE;
            }

            // Clamp to viewport
            left = Math.max(0, Math.min(left, viewport.width - MIN_SELECTION_SIZE));
            top = Math.max(0, Math.min(top, viewport.height - MIN_SELECTION_SIZE));
            if (left + width > viewport.width) width = viewport.width - left;
            if (top + height > viewport.height) height = viewport.height - top;

            const newDomRect: DomRect = { left, top, width, height };
            const pdfCoords = convertDomToPdf(newDomRect);
            if (pdfCoords) {
              onSelectionUpdate({
                ...selection,
                x: pdfCoords.x,
                y: pdfCoords.y,
                width: pdfCoords.width,
                height: pdfCoords.height,
              });
            }
          }
        }
      }

      setInteractionMode('none');
      setDragState(null);
      setActiveHandle(null);
      setMoveOffset(null);
    },
    [
      interactionMode,
      dragState,
      getDomRectFromDrag,
      convertDomToPdf,
      pageDimensions,
      onSelectionCreate,
      selectedId,
      moveOffset,
      selections,
      viewport,
      convertPdfToDom,
      onSelectionUpdate,
      activeHandle,
    ]
  );

  const handlePointerCancel = useCallback(() => {
    setInteractionMode('none');
    setDragState(null);
    setActiveHandle(null);
    setMoveOffset(null);
  }, []);

  // Current drag preview rect (for creating new selection)
  const dragPreviewRect = interactionMode === 'creating' && dragState ? getDomRectFromDrag(dragState) : null;

  // Get current DOM rect for a selection, considering active drag
  const getDisplayRect = useCallback(
    (selection: PdfSelection): DomRect | null => {
      const domRect = convertPdfToDom(selection);
      if (!domRect) return null;

      // If this selection is being moved
      if (interactionMode === 'moving' && selectedId === selection.id && dragState && moveOffset) {
        const newLeft = dragState.currentX - moveOffset.x;
        const newTop = dragState.currentY - moveOffset.y;

        // Clamp to viewport bounds
        const clampedLeft = viewport
          ? Math.max(0, Math.min(newLeft, viewport.width - domRect.width))
          : newLeft;
        const clampedTop = viewport
          ? Math.max(0, Math.min(newTop, viewport.height - domRect.height))
          : newTop;

        return {
          left: clampedLeft,
          top: clampedTop,
          width: domRect.width,
          height: domRect.height,
        };
      }

      // If this selection is being resized
      if (interactionMode === 'resizing' && selectedId === selection.id && dragState && activeHandle) {
        let { left, top, width, height } = domRect;
        const dx = dragState.currentX - dragState.startX;
        const dy = dragState.currentY - dragState.startY;

        switch (activeHandle) {
          case 'n':
            top += dy;
            height -= dy;
            break;
          case 's':
            height += dy;
            break;
          case 'w':
            left += dx;
            width -= dx;
            break;
          case 'e':
            width += dx;
            break;
          case 'nw':
            left += dx;
            width -= dx;
            top += dy;
            height -= dy;
            break;
          case 'ne':
            width += dx;
            top += dy;
            height -= dy;
            break;
          case 'sw':
            left += dx;
            width -= dx;
            height += dy;
            break;
          case 'se':
            width += dx;
            height += dy;
            break;
        }

        // Ensure minimum size
        if (width < MIN_SELECTION_SIZE) {
          if (activeHandle.includes('w')) {
            left = domRect.left + domRect.width - MIN_SELECTION_SIZE;
          }
          width = MIN_SELECTION_SIZE;
        }
        if (height < MIN_SELECTION_SIZE) {
          if (activeHandle.includes('n')) {
            top = domRect.top + domRect.height - MIN_SELECTION_SIZE;
          }
          height = MIN_SELECTION_SIZE;
        }

        // Clamp to viewport
        if (viewport) {
          left = Math.max(0, Math.min(left, viewport.width - MIN_SELECTION_SIZE));
          top = Math.max(0, Math.min(top, viewport.height - MIN_SELECTION_SIZE));
          if (left + width > viewport.width) width = viewport.width - left;
          if (top + height > viewport.height) height = viewport.height - top;
        }

        return { left, top, width, height };
      }

      return domRect;
    },
    [convertPdfToDom, interactionMode, selectedId, dragState, moveOffset, viewport, activeHandle]
  );

  // Render resize handles for selected item
  const renderResizeHandles = (domRect: DomRect) => {
    const { left, top, width, height } = domRect;
    const halfHandle = HANDLE_SIZE / 2;

    const handles: { position: ResizeHandle; x: number; y: number; cursor: string }[] = [
      { position: 'nw', x: left - halfHandle, y: top - halfHandle, cursor: 'nwse-resize' },
      { position: 'n', x: left + width / 2 - halfHandle, y: top - halfHandle, cursor: 'ns-resize' },
      { position: 'ne', x: left + width - halfHandle, y: top - halfHandle, cursor: 'nesw-resize' },
      { position: 'w', x: left - halfHandle, y: top + height / 2 - halfHandle, cursor: 'ew-resize' },
      { position: 'e', x: left + width - halfHandle, y: top + height / 2 - halfHandle, cursor: 'ew-resize' },
      { position: 'sw', x: left - halfHandle, y: top + height - halfHandle, cursor: 'nesw-resize' },
      { position: 's', x: left + width / 2 - halfHandle, y: top + height - halfHandle, cursor: 'ns-resize' },
      { position: 'se', x: left + width - halfHandle, y: top + height - halfHandle, cursor: 'nwse-resize' },
    ];

    return handles.map((h) => (
      <div
        key={h.position}
        style={{
          position: 'absolute',
          left: h.x,
          top: h.y,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: '#2196F3',
          border: '1px solid #fff',
          cursor: h.cursor,
          pointerEvents: 'auto',
        }}
      />
    ));
  };

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
            const domRect = getDisplayRect(sel);
            if (!domRect) return null;
            const isSelected = sel.id === selectedId;
            return (
              <div key={sel.id}>
                <div
                  style={{
                    ...styles.selection,
                    ...(isSelected ? styles.selectionSelected : {}),
                    left: domRect.left,
                    top: domRect.top,
                    width: domRect.width,
                    height: domRect.height,
                    cursor: isSelected ? 'move' : 'pointer',
                    pointerEvents: 'auto',
                  }}
                />
                {isSelected && renderResizeHandles(domRect)}
              </div>
            );
          })}

          {/* Drag preview */}
          {interactionMode === 'creating' && dragPreviewRect && (
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
    boxSizing: 'border-box',
  },
  selectionSelected: {
    border: '2px solid #1976D2',
    background: 'rgba(33, 150, 243, 0.3)',
  },
  dragPreview: {
    position: 'absolute',
    border: '2px dashed #F44336',
    background: 'rgba(244, 67, 54, 0.1)',
    pointerEvents: 'none',
  },
};
