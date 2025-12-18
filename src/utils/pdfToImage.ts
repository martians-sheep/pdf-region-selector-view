import { pdfjs } from 'react-pdf';

export type RenderResult = {
  blob: Blob;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
};

export async function renderPageToBlob(
  pdfUrl: string,
  pageNumber: number,
  scale: number = 3.5
): Promise<RenderResult> {
  const pdf = await pdfjs.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(pageNumber);

  const baseViewport = page.getViewport({ scale: 1.0 });
  const pageWidth = baseViewport.width;
  const pageHeight = baseViewport.height;

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png'
    );
  });

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    pageWidth,
    pageHeight,
  };
}

export async function getPdfPageCount(pdfUrl: string): Promise<number> {
  const pdf = await pdfjs.getDocument(pdfUrl).promise;
  return pdf.numPages;
}
