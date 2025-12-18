import { useState, useCallback } from 'react';
import type { PdfDetection, DetectionProgress } from '../types';
import { detectLayout, LayoutDetectError } from '../api/layoutDetectClient';
import { renderPageToBlob, getPdfPageCount } from '../utils/pdfToImage';

type UseLayoutDetectionReturn = {
  detections: PdfDetection[];
  progress: DetectionProgress;
  startDetection: (pdfUrl: string) => Promise<void>;
  clearDetections: () => void;
  isProcessing: boolean;
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useLayoutDetection(): UseLayoutDetectionReturn {
  const [detections, setDetections] = useState<PdfDetection[]>([]);
  const [progress, setProgress] = useState<DetectionProgress>({
    totalPages: 0,
    processedPages: 0,
    currentPage: 0,
    status: 'idle',
  });

  const clearDetections = useCallback(() => {
    setDetections([]);
    setProgress({
      totalPages: 0,
      processedPages: 0,
      currentPage: 0,
      status: 'idle',
    });
  }, []);

  const startDetection = useCallback(async (pdfUrl: string) => {
    setDetections([]);

    try {
      const totalPages = await getPdfPageCount(pdfUrl);

      setProgress({
        totalPages,
        processedPages: 0,
        currentPage: 1,
        status: 'processing',
      });

      const allDetections: PdfDetection[] = [];

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        setProgress((prev) => ({
          ...prev,
          currentPage: pageNumber,
        }));

        try {
          const { blob, width: imageWidth, height: imageHeight, pageWidth, pageHeight } =
            await renderPageToBlob(pdfUrl, pageNumber);

          const response = await detectLayout(blob, pageNumber);

          const scaleX = pageWidth / imageWidth;
          const scaleY = pageHeight / imageHeight;

          const pageDetections: PdfDetection[] = response.detections.map((det) => ({
            id: generateId(),
            pageNumber,
            label: det.label,
            score: det.score,
            x: det.bbox.x * scaleX,
            y: pageHeight - (det.bbox.y + det.bbox.h) * scaleY,
            width: det.bbox.w * scaleX,
            height: det.bbox.h * scaleY,
            pageWidth,
            pageHeight,
          }));

          allDetections.push(...pageDetections);
          setDetections([...allDetections]);
        } catch (error) {
          if (error instanceof LayoutDetectError) {
            console.warn(`Page ${pageNumber}: ${error.message}`);
          } else {
            console.warn(`Page ${pageNumber}: Failed to process`, error);
          }
        }

        setProgress((prev) => ({
          ...prev,
          processedPages: pageNumber,
        }));
      }

      setProgress((prev) => ({
        ...prev,
        status: 'completed',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
    }
  }, []);

  return {
    detections,
    progress,
    startDetection,
    clearDetections,
    isProcessing: progress.status === 'processing',
  };
}
