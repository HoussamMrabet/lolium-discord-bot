import { renderBarChart } from '../../src/embeds/charts/barChart.js';
import { renderLineChart } from '../../src/embeds/charts/lineChart.js';

function isPng(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

describe('renderBarChart', () => {
  it('renders a PNG buffer', () => {
    const buf = renderBarChart({
      title: 'Top LP Gained',
      bars: [
        { label: 'Alpha', value: 40 },
        { label: 'Bravo', value: 10 },
      ],
    });
    expect(isPng(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('handles the empty case', () => {
    expect(isPng(renderBarChart({ title: 'x', bars: [] }))).toBe(true);
  });
});

describe('renderLineChart', () => {
  it('renders a PNG buffer', () => {
    const buf = renderLineChart({
      title: 'Rank Progression',
      points: [
        { x: '07-20', y: 1440 },
        { x: '07-21', y: 1465 },
        { x: '07-22', y: 1450 },
      ],
    });
    expect(isPng(buf)).toBe(true);
  });

  it('handles single and empty point sets', () => {
    expect(isPng(renderLineChart({ title: 'x', points: [] }))).toBe(true);
    expect(isPng(renderLineChart({ title: 'x', points: [{ x: 'a', y: 5 }] }))).toBe(true);
  });
});
