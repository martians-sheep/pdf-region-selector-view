import type { PageViewport } from 'pdfjs-dist';
import type { PdfDetection, DetectionLabel } from '../types';

type Props = {
  detections: PdfDetection[];
  viewport: PageViewport | null;
  showLabels?: boolean;
  scoreThreshold?: number;
};

const LABEL_COLORS: Record<DetectionLabel, string> = {
  Text: '#4CAF50',
  Title: '#2196F3',
  List: '#00BCD4',
  Table: '#9C27B0',
  Figure: '#FF9800',
};

export default function DetectionOverlay({
  detections,
  viewport,
  showLabels = true,
  scoreThreshold = 0,
}: Props) {
  if (!viewport) return null;

  const filteredDetections = detections.filter((d) => d.score >= scoreThreshold);

  return (
    <>
      {filteredDetections.map((detection) => {
        const topLeft = viewport.convertToViewportPoint(detection.x, detection.y);
        const bottomRight = viewport.convertToViewportPoint(
          detection.x + detection.width,
          detection.y + detection.height
        );

        const left = Math.min(topLeft[0], bottomRight[0]);
        const top = Math.min(topLeft[1], bottomRight[1]);
        const width = Math.abs(bottomRight[0] - topLeft[0]);
        const height = Math.abs(bottomRight[1] - topLeft[1]);

        const color = LABEL_COLORS[detection.label];

        return (
          <div
            key={detection.id}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              border: `2px solid ${color}`,
              background: `${color}20`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            {showLabels && (
              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  left: 0,
                  background: color,
                  color: '#fff',
                  fontSize: '10px',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {detection.label} ({(detection.score * 100).toFixed(0)}%)
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
