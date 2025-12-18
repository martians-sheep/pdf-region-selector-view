import type { PdfDetection, PdfSelection } from '../types';

/**
 * 検出結果から全ての矩形を包含するバウンディングボックスを計算し、
 * PdfSelectionとして返す
 */
export function createBoundingBoxFromDetections(
  detections: PdfDetection[],
  pageNumber: number
): PdfSelection | null {
  if (detections.length === 0) {
    return null;
  }

  // 最小・最大座標を計算
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let pageWidth = 0;
  let pageHeight = 0;

  for (const det of detections) {
    minX = Math.min(minX, det.x);
    minY = Math.min(minY, det.y);
    maxX = Math.max(maxX, det.x + det.width);
    maxY = Math.max(maxY, det.y + det.height);
    pageWidth = det.pageWidth;
    pageHeight = det.pageHeight;
  }

  return {
    id: crypto.randomUUID(),
    pageNumber,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    pageWidth,
    pageHeight,
    createdAt: new Date().toISOString(),
  };
}
