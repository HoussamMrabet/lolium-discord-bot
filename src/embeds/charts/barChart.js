import { createCanvas } from '@napi-rs/canvas';

const BG = '#1e2124';
const GRID = '#2f3136';
const TEXT = '#dcddde';
const MUTED = '#99aab5';
const ACCENT = '#c8aa6e';

/**
 * Renders a simple horizontal-ish vertical bar chart to a PNG buffer.
 * @param {{title:string, bars:{label:string,value:number}[], width?:number, height?:number, color?:string}} opts
 * @returns {Buffer}
 */
export function renderBarChart({ title, bars = [], width = 800, height = 400, color = ACCENT }) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(title, 24, 34);

  const pad = { top: 60, right: 30, bottom: 60, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!bars.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '16px sans-serif';
    ctx.fillText('No data for this period.', pad.left, pad.top + plotH / 2);
    return canvas.toBuffer('image/png');
  }

  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const steps = 4;
  ctx.strokeStyle = GRID;
  ctx.fillStyle = MUTED;
  ctx.font = '12px sans-serif';
  for (let i = 0; i <= steps; i += 1) {
    const v = (i / steps) * maxValue;
    const y = pad.top + plotH - (v / maxValue) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), 12, y + 4);
  }

  const slot = plotW / bars.length;
  const barW = Math.min(80, slot * 0.6);
  bars.forEach((bar, i) => {
    const h = (bar.value / maxValue) * plotH;
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = TEXT;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(bar.value), x + barW / 2, y - 6);

    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    const label = String(bar.label).slice(0, 12);
    ctx.fillText(label, x + barW / 2, height - pad.bottom + 20);
    ctx.textAlign = 'left';
  });

  return canvas.toBuffer('image/png');
}

export default renderBarChart;
