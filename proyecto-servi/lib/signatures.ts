import type { Firma } from '../types/models';

export type StrokePoint = { x: number; y: number };

function toBase64Utf8(input: string): string {
  if (typeof globalThis.btoa === 'function') {
    const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    return globalThis.btoa(utf8);
  }

  const utf8Bytes = new TextEncoder().encode(input);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < utf8Bytes.length; index += 3) {
    const byte1 = utf8Bytes[index] ?? 0;
    const byte2 = utf8Bytes[index + 1] ?? 0;
    const byte3 = utf8Bytes[index + 2] ?? 0;
    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    const c1 = alphabet[(chunk >> 18) & 63];
    const c2 = alphabet[(chunk >> 12) & 63];
    const c3 = index + 1 < utf8Bytes.length ? alphabet[(chunk >> 6) & 63] : '=';
    const c4 = index + 2 < utf8Bytes.length ? alphabet[chunk & 63] : '=';

    output += `${c1}${c2}${c3}${c4}`;
  }

  return output;
}

export function strokeToPath(stroke: StrokePoint[]): string {
  if (stroke.length < 2) return '';
  return stroke.reduce(
    (acc, point, index) =>
      index === 0
        ? `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
        : `${acc} L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    '',
  );
}

export function strokesToSvgDataUrl(
  strokes: StrokePoint[][],
  width = 320,
  height = 160,
): string {
  const paths = strokes
    .filter((stroke) => stroke.length > 1)
    .map(
      (stroke) =>
        `<path d="${strokeToPath(stroke)}" stroke="#111827" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${paths}</svg>`;
  return `data:image/svg+xml;base64,${toBase64Utf8(svg)}`;
}

export function hasValidStroke(strokes: StrokePoint[][]): boolean {
  return strokes.some((stroke) => stroke.length > 1);
}

export function buildFirmaObject(params: {
  dataUrl: string;
  signerRole: Firma['signerRole'];
  signerName: string;
}): Firma {
  return {
    format: 'data-url',
    mime: 'image/svg+xml',
    encoding: 'base64',
    capturedAt: new Date().toISOString(),
    signerRole: params.signerRole,
    signerName: params.signerName,
    data: params.dataUrl,
  };
}

export const SIGNATURE_CANVAS = {
  width: 320,
  height: 160,
};
