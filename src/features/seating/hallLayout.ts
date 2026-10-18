import type { EventDetailsDto, SeatDto, SectionDto } from '../../types/api';

// Turns the server's rectangular hall (RowsCount × SeatsPerRow, zones by row range)
// into a curved, fan-shaped auditorium. Every drawn seat is a REAL seat from the server –
// only the positions are computed here. Aisles are visual gaps between seat blocks.
//
// Coordinates: the fan's center is (0, 0) above the stage; y grows toward the back of the hall.
// Row 1 is the closest to the stage. Seat 1 is on the right (as seen from the audience).

export const SEAT_W = 16;
export const SEAT_H = 13;
const PITCH = 24; // distance between seat centers in the first row
const ROW_GAP = 28; // distance between rows
const ZONE_GAP = 26; // extra space between price zones (cross aisle)
const AISLE_SLOTS = 1.5; // aisle width, in "seats"
const STAGE_GAP = 74; // from the stage front to row 1

export interface PlacedSeat {
  seat: SeatDto;
  x: number;
  y: number;
  rotate: number; // degrees, so the seat faces the stage
}

export interface RowLabel {
  row: number;
  x: number;
  y: number;
}

export interface ZoneLabel {
  section: SectionDto;
  x: number;
  y: number;
  arcPath: string;
}

export interface HallLayout {
  seats: PlacedSeat[];
  rowLabels: RowLabel[];
  zoneLabels: ZoneLabel[];
  aislePaths: string[];
  hallPath: string;
  stage: { path: string; frontPath: string; labelX: number; labelY: number };
  viewBox: { x: number; y: number; w: number; h: number };
  /** Seat lookup for keyboard navigation: rows[row][seatNumber] = seat id */
  grid: Map<number, Map<number, number>>;
  /** A seat-to-seat distance in layout units (used to pick a usable zoom on small screens) */
  pitch: number;
  frontCenter: { x: number; y: number };
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function blockCount(seatsPerRow: number) {
  if (seatsPerRow <= 7) return 1;
  if (seatsPerRow <= 18) return 2;
  if (seatsPerRow <= 32) return 3;
  return 4;
}

function arcPath(r: number, fromAngle: number, toAngle: number) {
  // Angles in radians, 0 = straight down, positive = to the right
  const x1 = r * Math.sin(fromAngle);
  const y1 = r * Math.cos(fromAngle);
  const x2 = r * Math.sin(toAngle);
  const y2 = r * Math.cos(toAngle);
  const large = Math.abs(toAngle - fromAngle) > Math.PI ? 1 : 0;
  // sweep: from right (positive angle) to left (negative) going through the bottom
  const sweep = fromAngle > toAngle ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function buildHallLayout(event: EventDetailsDto): HallLayout {
  const rows = event.rowsCount;
  const perRow = event.seatsPerRow;
  const sections = [...event.sections].sort((a, b) => a.fromRow - b.fromRow);

  // ---- Angles ----
  const spanDeg = clamp(40 + perRow * 1.6, 56, 112);
  const span = toRad(spanDeg);
  const blocks = blockCount(perRow);
  const slots = perRow + (blocks - 1) * AISLE_SLOTS;
  const slotAngle = span / slots;
  const r0 = Math.max((slots * PITCH) / span, 150);

  // Which block each seat number belongs to (blocks as equal as possible)
  const blockOf = (seatIndex: number) => Math.min(blocks - 1, Math.floor((seatIndex * blocks) / perRow));
  const angleAtSlot = (u: number) => span / 2 - u * slotAngle;
  const seatAngle = (seatIndex: number) => angleAtSlot(seatIndex + blockOf(seatIndex) * AISLE_SLOTS + 0.5);

  // ---- Radii: each zone boundary adds a cross aisle ----
  const zoneIndexOfRow = (row: number) => {
    const i = sections.findIndex((s) => row >= s.fromRow && row <= s.toRow);
    return i < 0 ? 0 : i;
  };
  const radiusOfRow = (row: number) => r0 + (row - 1) * ROW_GAP + zoneIndexOfRow(row) * ZONE_GAP;

  // ---- Seats ----
  const grid = new Map<number, Map<number, number>>();
  const seats: PlacedSeat[] = event.seats.map((seat) => {
    const r = radiusOfRow(seat.rowNumber);
    const a = seatAngle(seat.seatNumber - 1);
    if (!grid.has(seat.rowNumber)) grid.set(seat.rowNumber, new Map());
    grid.get(seat.rowNumber)!.set(seat.seatNumber, seat.id);
    return {
      seat,
      x: r * Math.sin(a),
      y: r * Math.cos(a),
      rotate: -toDeg(a),
    };
  });

  // ---- Row numbers on both ends ----
  const rowLabels: RowLabel[] = [];
  for (let row = 1; row <= rows; row++) {
    const r = radiusOfRow(row);
    for (const u of [-0.95, slots + 0.95]) {
      const a = angleAtSlot(u);
      rowLabels.push({ row, x: r * Math.sin(a), y: r * Math.cos(a) });
    }
  }

  // ---- Zone labels + divider arcs (in the gap before each zone's first row) ----
  const edge = span / 2 + slotAngle * 0.4;
  const zoneLabels: ZoneLabel[] = sections.map((section) => {
    const r = radiusOfRow(section.fromRow) - (section.fromRow === 1 ? 34 : (ROW_GAP + ZONE_GAP) / 2 + 2);
    return { section, x: 0, y: r, arcPath: arcPath(r, edge, -edge) };
  });

  // ---- Aisles (between blocks), from the first row to the last ----
  const rFirst = radiusOfRow(1) - SEAT_H;
  const rLast = radiusOfRow(rows) + SEAT_H;
  const aislePaths: string[] = [];
  for (let b = 1; b < blocks; b++) {
    const boundarySeat = Math.round((b * perRow) / blocks); // first seat index of block b
    const u = boundarySeat + (b - 1) * AISLE_SLOTS + AISLE_SLOTS / 2;
    const a = angleAtSlot(u);
    aislePaths.push(
      `M ${(rFirst * Math.sin(a)).toFixed(1)} ${(rFirst * Math.cos(a)).toFixed(1)} L ${(rLast * Math.sin(a)).toFixed(1)} ${(rLast * Math.cos(a)).toFixed(1)}`,
    );
  }

  // ---- Hall floor (a fan around all the seats) ----
  const hallInner = r0 - 52;
  const hallOuter = rLast + 34;
  const hallEdge = span / 2 + slotAngle * 2.2;
  const ix1 = hallInner * Math.sin(hallEdge);
  const iy1 = hallInner * Math.cos(hallEdge);
  const ox1 = hallOuter * Math.sin(hallEdge);
  const oy1 = hallOuter * Math.cos(hallEdge);
  const hallPath = [
    `M ${ix1.toFixed(1)} ${iy1.toFixed(1)}`,
    `L ${ox1.toFixed(1)} ${oy1.toFixed(1)}`,
    `A ${hallOuter.toFixed(1)} ${hallOuter.toFixed(1)} 0 0 1 ${(-ox1).toFixed(1)} ${oy1.toFixed(1)}`,
    `L ${(-ix1).toFixed(1)} ${iy1.toFixed(1)}`,
    `A ${hallInner.toFixed(1)} ${hallInner.toFixed(1)} 0 0 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)}`,
    'Z',
  ].join(' ');

  // ---- Stage: a curved platform (a band between two arcs), its front edge facing the audience ----
  const rsFront = r0 - STAGE_GAP;
  const stageDepth = clamp(rsFront * 0.32, 46, 90);
  const rsBack = rsFront - stageDepth;
  const stageHalf = Math.min(span / 2 * 0.78, toRad(48));
  const fx = rsFront * Math.sin(stageHalf);
  const fy = rsFront * Math.cos(stageHalf);
  const bx = rsBack * Math.sin(stageHalf);
  const by = rsBack * Math.cos(stageHalf);
  const stagePath = [
    `M ${fx.toFixed(1)} ${fy.toFixed(1)}`,
    `A ${rsFront.toFixed(1)} ${rsFront.toFixed(1)} 0 0 1 ${(-fx).toFixed(1)} ${fy.toFixed(1)}`,
    `L ${(-bx).toFixed(1)} ${by.toFixed(1)}`,
    `A ${rsBack.toFixed(1)} ${rsBack.toFixed(1)} 0 0 0 ${bx.toFixed(1)} ${by.toFixed(1)}`,
    'Z',
  ].join(' ');
  const stageFront = arcPath(rsFront, stageHalf, -stageHalf);
  const back = by;

  // ---- View box around everything ----
  const xs = [ox1, -ox1, ix1, -ix1, fx, -fx];
  const ys = [back, oy1, iy1, hallOuter];
  const pad = 24;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;

  return {
    seats,
    rowLabels,
    zoneLabels,
    aislePaths,
    hallPath,
    stage: { path: stagePath, frontPath: stageFront, labelX: 0, labelY: (rsBack + rsFront) / 2 + 6 },
    viewBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    grid,
    pitch: PITCH,
    frontCenter: { x: 0, y: r0 },
  };
}
