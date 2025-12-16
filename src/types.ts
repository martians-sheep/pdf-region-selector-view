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
