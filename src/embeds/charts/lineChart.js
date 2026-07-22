import { createCanvas } from '@napi-rs/canvas';

const BG = '#1e2124';
const GRID = '#2f3136';
const TEXT = '#dcddde';
const MUTED = '#99aab5';
const ACCENT = '#c8aa6e';

/**
 * Renders a line chart (e.g. rank/LP progression) to a PNG buffer.
 * @param {{title:string, points:{x:string,y:number}[], yLabel?:string, width?:number, height?:number, color?:string}} opts
 * @returns {Buffer}
 */
export function renderLineChart({
  title,
  points = [],
  yLabel = '',
  width = 800,
  height = 400,
  color = ACCENT,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(title, 24, 34);

  const pad = { top: 60, right: 30, bottom: 50, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!points.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '16px sans-serif';
    ctx.fillText('No data for this period.', pad.left, pad.top + plotH / 2);
    return canvas.toBuffer('image/png');
  }

  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * 0.1;
  min -= margin;
  max += margin;

  const xAt = (i) =>
    pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v) => pad.top + plotH - ((v - min) / (max - min)) * plotH;

  ctx.strokeStyle = GRID;
  ctx.fillStyle = MUTED;
  ctx.font = '12px sans-serif';
  const steps = 4;
  for (let i = 0; i <= steps; i += 1) {
    const v = min + (i / steps) * (max - min);
    const y = yAt(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), 12, y + 4);
  }

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = color;
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(xAt(i), yAt(p.y), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = MUTED;
  ctx.font = '11px sans-serif';
  const labelIdx = points.length <= 1 ? [0] : [0, Math.floor(points.length / 2), points.length - 1];
  for (const i of labelIdx) {
    ctx.fillText(String(points[i].x), xAt(i) - 18, height - pad.bottom + 20);
  }

  if (yLabel) {
    ctx.save();
    ctx.translate(16, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}

export default renderLineChart;
