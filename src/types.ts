export type PdfSelection = {
  id: string;
  pageNumber: number;

  // PDF points
  x: number;
  y: number;
  width: number;
  height: number;

  pageWidth: number;
  pageHeight: number;

  createdAt: string;
};

export type DomRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Layout Detection API types
export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DetectionLabel = 'Text' | 'Title' | 'List' | 'Table' | 'Figure';

export type Detection = {
  label: DetectionLabel;
  score: number;
  bbox: BBox;
};

export type LayoutDetectResponse = {
  pageNumber: number | null;
  imageSize: {
    width: number;
    height: number;
  };
  detections: Detection[];
};

export type PdfDetection = {
  id: string;
  pageNumber: number;
  label: DetectionLabel;
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
};

export type DetectionProgress = {
  totalPages: number;
  processedPages: number;
  currentPage: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
};
