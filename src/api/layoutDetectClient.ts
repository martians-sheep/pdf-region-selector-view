import type { LayoutDetectResponse } from '../types';

export class LayoutDetectError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'LayoutDetectError';
  }
}

export async function detectLayout(
  imageBlob: Blob,
  pageNumber: number
): Promise<LayoutDetectResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'page.png');
  formData.append('pageNumber', String(pageNumber));

  const response = await fetch('/v1/layout/detect', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => '');
    }

    const message =
      typeof details === 'object' &&
      details !== null &&
      'detail' in details &&
      typeof (details as { detail: unknown }).detail === 'string'
        ? (details as { detail: string }).detail
        : `API Error: ${response.status}`;

    throw new LayoutDetectError(response.status, message, details);
  }

  return response.json();
}
