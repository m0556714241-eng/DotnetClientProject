import styles from './HeroHall.module.css';

// The hero illustration: a small hall that explains the product at a glance –
// price zones in color, taken seats in gray, and "your seats" marked with a label.
// Decorative only (the real, interactive map is on every event page).

const ZONES = [
  { name: 'VIP', color: '#B8893B', rows: [0, 1] },
  { name: 'אולם', color: '#3E7BE0', rows: [2, 3, 4] },
  { name: 'יציע', color: '#7D68D8', rows: [5, 6, 7] },
];

const CX = 280;
const CY = 30;
const SPAN = 1.6; // radians
const PICK_ROW = 4;

function zoneOf(row: number) {
  return ZONES.find((z) => z.rows.includes(row))!;
}

// A fixed pattern of taken seats, so the drawing looks like a real, busy hall
function isTaken(row: number, i: number) {
  return (row * 7 + i * 13) % 5 === 0 || (row < 2 && i % 3 === 1);
}

export function HeroHall() {
  const seats: Array<{ x: number; y: number; r: number; color: string; taken: boolean; picked: boolean }> = [];
  let pickA = { x: 0, y: 0 };

  for (let row = 0; row < 8; row++) {
    const radius = 150 + row * 30 + (row >= 2 ? 10 : 0) + (row >= 5 ? 10 : 0);
    const count = 12 + row * 2;
    const middle = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      const a = SPAN / 2 - (SPAN * (i + 0.5)) / count;
      const x = CX + radius * Math.sin(a);
      const y = CY + radius * Math.cos(a);
      const picked = row === PICK_ROW && (i === middle - 1 || i === middle);
      if (picked && i === middle - 1) pickA = { x, y };
      seats.push({
        x,
        y,
        r: -a * (180 / Math.PI),
        color: zoneOf(row).color,
        taken: !picked && isTaken(row, i),
        picked,
      });
    }
  }

  // Stage: a curved band, like the real map
  const front = 108;
  const back = 62;
  const half = 0.62;
  const p = (r: number, a: number) => `${(CX + r * Math.sin(a)).toFixed(1)} ${(CY + r * Math.cos(a)).toFixed(1)}`;
  const stage = `M ${p(front, half)} A ${front} ${front} 0 0 1 ${p(front, -half)} L ${p(back, -half)} A ${back} ${back} 0 0 0 ${p(back, half)} Z`;
  const stageFront = `M ${p(front, half)} A ${front} ${front} 0 0 1 ${p(front, -half)}`;

  return (
    <figure className={styles.figure}>
      <svg viewBox="0 0 560 450" role="img" aria-label="איור של אולם: אזורי מחיר בצבעים, מושבים תפוסים באפור, ושני מושבים שנבחרו">
        <defs>
          <linearGradient id="heroStage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E1A2B" />
            <stop offset="100%" stopColor="#2A4566" />
          </linearGradient>
        </defs>

        <path d={stage} fill="url(#heroStage)" />
        <path d={stageFront} fill="none" stroke="#D6B36C" strokeWidth="3" strokeLinecap="round" />
        <text x={CX} y={CY + 92} textAnchor="middle" className={styles.stageText}>
          במה
        </text>

        {seats.map((s, i) => (
          <rect
            key={i}
            x={s.x - 7}
            y={s.y - 6}
            width="14"
            height="12"
            rx="3.2"
            transform={`rotate(${s.r.toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`}
            fill={s.picked ? '#FFFFFF' : s.taken ? 'rgba(247,243,234,0.14)' : s.color}
            stroke={s.picked ? '#D6B36C' : 'none'}
            strokeWidth={s.picked ? 2.5 : 0}
            className={s.picked ? styles.picked : undefined}
          />
        ))}

        {/* "your seats" callout */}
        <g className={styles.callout}>
          <line x1={pickA.x + 7} y1={pickA.y + 8} x2={pickA.x + 7} y2={pickA.y + 46} stroke="#F7F3EA" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x={pickA.x - 66} y={pickA.y + 46} width="146" height="44" rx="10" fill="#F7F3EA" />
          <text x={pickA.x + 7} y={pickA.y + 66} textAnchor="middle" className={styles.calloutTitle}>
            המושבים שלך ✓
          </text>
          <text x={pickA.x + 7} y={pickA.y + 82} textAnchor="middle" className={styles.calloutSub}>
            אולם · שורה 5 · מושבים 10–11
          </text>
        </g>
      </svg>

      <figcaption className={styles.legend}>
        {ZONES.map((z) => (
          <span key={z.name}>
            <i style={{ background: z.color }} aria-hidden="true" />
            {z.name}
          </span>
        ))}
        <span>
          <i className={styles.takenSwatch} aria-hidden="true" />
          תפוס
        </span>
      </figcaption>
    </figure>
  );
}
