import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { EventDetailsDto, SeatDto, SectionDto } from '../../types/api';
import type { SectionStyle } from '../../utils/sectionColors';
import { formatPrice } from '../../utils/format';
import { buildHallLayout, SEAT_H, SEAT_W, type HallLayout } from './hallLayout';
import type { ToggleResult } from './useSeatSelection';
import styles from './SeatingMap.module.css';

interface Props {
  event: EventDetailsDto;
  sectionStyles: Map<number, SectionStyle>;
  selectedIds: Set<number>;
  onToggle: (seat: SeatDto) => ToggleResult;
  /** true = the map is shown but seats can't be chosen (past event / admin) */
  readOnly?: boolean;
}

interface View {
  k: number;
  tx: number;
  ty: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DRAG_THRESHOLD = 5;

function seatLabel(seat: SeatDto, section: SectionDto | undefined, selected: boolean) {
  const status = selected ? 'נבחר' : seat.status === 'Available' ? 'פנוי' : 'תפוס';
  const zone = section ? `אזור ${section.name}, ` : '';
  const price = section ? `, ${formatPrice(section.price)}` : '';
  return `${zone}שורה ${seat.rowNumber}, מושב ${seat.seatNumber}${price}, ${status}`;
}

export function SeatingMap({ event, sectionStyles, selectedIds, onToggle, readOnly }: Props) {
  // The geometry depends only on the hall STRUCTURE, not on seat statuses – so a refresh after a 409
  // (new statuses) keeps the user's zoom and position. Statuses are read from seatsById at render time.
  const structureKey = `${event.id}|${event.rowsCount}|${event.seatsPerRow}|${event.seats.length}|${event.sections
    .map((s) => `${s.id}:${s.fromRow}-${s.toRow}:${s.price}:${s.name}`)
    .join(',')}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => buildHallLayout(event), [structureKey]);
  const sectionsById = useMemo(() => new Map(event.sections.map((s) => [s.id, s])), [event.sections]);
  const seatsById = useMemo(() => new Map(event.seats.map((s) => [s.id, s])), [event.seats]);
  const placedById = useMemo(() => new Map(layout.seats.map((p) => [p.seat.id, p])), [layout]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { x: vx, y: vy, w: vw, h: vh } = layout.viewBox;

  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [hint, setHint] = useState<{ seatId: number; left: number; top: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  // ---------- zoom / pan math (in view-box units) ----------
  const clampView = useCallback(
    (v: View): View => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
      // Keep the zoomed content covering the viewport
      const minTx = vx + vw - k * (vx + vw);
      const maxTx = vx - k * vx;
      const minTy = vy + vh - k * (vy + vh);
      const maxTy = vy - k * vy;
      return {
        k,
        tx: Math.min(maxTx, Math.max(minTx, v.tx)),
        ty: Math.min(maxTy, Math.max(minTy, v.ty)),
      };
    },
    [vx, vy, vw, vh],
  );

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      setView((v) => {
        const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
        const ratio = k / v.k;
        return clampView({ k, tx: px - (px - v.tx) * ratio, ty: py - (py - v.ty) * ratio });
      });
    },
    [clampView],
  );

  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const center = useMemo(() => ({ x: vx + vw / 2, y: vy + vh / 2 }), [vx, vy, vw, vh]);

  // Small screens: start zoomed in on the front-center so seats are big enough to tap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const pxPerUnit = Math.min(width / vw, el.clientHeight / vh);
    const seatPx = layout.pitch * pxPerUnit;
    if (seatPx >= 16) {
      setView({ k: 1, tx: 0, ty: 0 });
      return;
    }
    const k = Math.min(MAX_ZOOM, 18 / seatPx);
    const focus = { x: layout.frontCenter.x, y: layout.frontCenter.y + vh * 0.12 };
    setView(clampView({ k, tx: center.x - focus.x * k, ty: center.y - focus.y * k }));
  }, [layout, vw, vh, center, clampView]);

  // Trackpad pinch / Ctrl+wheel zooms the map; a normal wheel keeps scrolling the page
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = toViewBox(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [toViewBox, zoomAt]);

  // ---------- pointer: drag to pan, two fingers to pinch, tap to select ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ startX: number; startY: number; moved: boolean; pinchDist?: number }>({
    startX: 0,
    startY: 0,
    moved: false,
  });

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { startX: e.clientX, startY: e.clientY, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current.moved = true;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && drag.current.pinchDist) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(dist / drag.current.pinchDist, mid.x, mid.y);
      drag.current.pinchDist = dist;
      return;
    }

    const total = Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY);
    if (!drag.current.moved && total < DRAG_THRESHOLD) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setHint(null);
    }
    // client px -> view-box units
    const p1 = toViewBox(prev.x, prev.y);
    const p2 = toViewBox(e.clientX, e.clientY);
    setView((v) => clampView({ ...v, tx: v.tx + (p2.x - p1.x), ty: v.ty + (p2.y - p1.y) }));
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinchDist = undefined;
  };

  // ---------- seats ----------
  const showMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((m) => (m === text ? null : m)), 3500);
  }, []);

  const activate = useCallback(
    (seatId: number) => {
      const seat = seatsById.get(seatId);
      if (!seat) return;
      if (readOnly) return;
      const result = onToggle(seat);
      if (result === 'limit') showMessage('אפשר לבחור עד 10 מושבים בהזמנה אחת');
      if (result === 'unavailable') showMessage('המושב הזה כבר תפוס');
    },
    [seatsById, onToggle, readOnly, showMessage],
  );


  const placeHint = useCallback(
    (seatId: number) => {
      const svg = svgRef.current;
      const container = containerRef.current;
      const el = svg?.querySelector(`[data-seat-id="${seatId}"]`);
      if (!svg || !container || !el) return;
      const box = el.getBoundingClientRect();
      const host = container.getBoundingClientRect();
      // Keep the tooltip inside the map frame
      const left = Math.min(host.width - 80, Math.max(80, box.left + box.width / 2 - host.left));
      const top = Math.max(96, box.top - host.top);
      setHint({ seatId, left, top });
    },
    [],
  );

  const onSeatClick = useCallback(
    (e: ReactMouseEvent) => {
      const id = seatIdFromEvent(e.target);
      if (id === null) return;
      if (drag.current.moved) return; // it was a pan, not a tap
      setFocusId(id);
      activate(id);
      placeHint(id);
    },
    [activate, placeHint],
  );

  const onSeatOver = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse' || (drag.current.moved && pointers.current.size > 0)) return;
      const id = seatIdFromEvent(e.target);
      if (id !== null) placeHint(id);
    },
    [placeHint],
  );

  const onFocusSeat = useCallback(
    (id: number) => {
      setFocusId(id);
      placeHint(id);
    },
    [placeHint],
  );

  // Keyboard: arrows move between seats (RTL – seat 1 is on the right), Enter/Space selects
  const onSeatKeyDown = useCallback((e: KeyboardEvent) => {
    const id = seatIdFromEvent(e.target);
    if (id === null) return;
    const seat = seatsById.get(id);
    if (!seat) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(id);
      return;
    }

    const moves: Record<string, [number, number]> = {
      ArrowRight: [0, -1],
      ArrowLeft: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const nextId = findNeighbor(layout, seat.rowNumber, seat.seatNumber, move[0], move[1]);
    if (nextId !== null) {
      setFocusId(nextId);
      const el = svgRef.current?.querySelector<SVGGElement>(`[data-seat-id="${nextId}"]`);
      el?.focus();
    }
  }, [seatsById, activate, layout]);

  const tabStopId = focusId ?? firstSeatId(layout);
  const hintSeat = hint ? seatsById.get(hint.seatId) : undefined;
  const hintSection = hintSeat ? sectionsById.get(hintSeat.sectionId) : undefined;

  const zoomButton = (factor: number) => zoomAt(factor, center.x, center.y);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarHint}>
          {readOnly ? 'מפת האולם לצפייה בלבד' : 'לחצו על מושב כדי לבחור · גררו להזזה · Ctrl + גלגלת להגדלה'}
        </span>
        <div className={styles.zoom} role="group" aria-label="הגדלת המפה">
          <button type="button" onClick={() => zoomButton(1.4)} aria-label="הגדלה" disabled={view.k >= MAX_ZOOM}>
            <Plus size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => zoomButton(1 / 1.4)} aria-label="הקטנה" disabled={view.k <= MIN_ZOOM}>
            <Minus size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="הצגת כל האולם" className={styles.fit}>
            <Maximize2 size={15} aria-hidden="true" />
            כל האולם
          </button>
        </div>
      </div>

      <div ref={containerRef} className={`${styles.canvas} ${readOnly ? styles.readOnly : ''}`}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`מפת האולם: ${event.rowsCount} שורות, ${event.seatsPerRow} מושבים בשורה. השתמשו בחיצים כדי לעבור בין מושבים ובמקש Enter כדי לבחור.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHint(null)}
        >
          <defs>
            <radialGradient id="hallFloor" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F3EEE3" />
            </radialGradient>
            <linearGradient id="stageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F1C2E" />
              <stop offset="100%" stopColor="#24405F" />
            </linearGradient>
            <linearGradient id="stageGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D6B36C" stopOpacity="0" />
              <stop offset="100%" stopColor="#D6B36C" stopOpacity="1" />
            </linearGradient>
          </defs>

          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            <path d={layout.hallPath} fill="url(#hallFloor)" stroke="#D9D2C3" strokeWidth={1.5} />
            <path d={layout.stage.path} fill="url(#stageFill)" />
            {/* the stage front edge, lit in gold */}
            <path d={layout.stage.frontPath} fill="none" stroke="#B8893B" strokeWidth={4} strokeLinecap="round" />
            <path d={layout.stage.frontPath} fill="none" stroke="url(#stageGlow)" strokeWidth={26} opacity={0.35} />
            <text x={layout.stage.labelX} y={layout.stage.labelY} className={styles.stageLabel} textAnchor="middle">
              במה
            </text>

            {layout.aislePaths.map((d, i) => (
              <path key={i} d={d} className={styles.aisle} />
            ))}

            {layout.zoneLabels.map((z) => (
              <g key={z.section.id} aria-hidden="true">
                <path d={z.arcPath} className={styles.zoneArc} stroke={sectionStyles.get(z.section.id)?.color} />
                <text x={z.x} y={z.y + 4} textAnchor="middle" className={styles.zoneLabel}>
                  {z.section.name} · {formatPrice(z.section.price)}
                </text>
              </g>
            ))}

            {layout.rowLabels.map((r, i) => (
              <text key={i} x={r.x} y={r.y + 3.5} textAnchor="middle" className={styles.rowLabel} aria-hidden="true">
                {r.row}
              </text>
            ))}

            <SeatLayer
              layout={layout}
              sectionsById={sectionsById}
              sectionStyles={sectionStyles}
              selectedIds={selectedIds}
              tabStopId={tabStopId}
              readOnly={!!readOnly}
              onClick={onSeatClick}
              onKeyDown={onSeatKeyDown}
              onPointerOver={onSeatOver}
              seatsById={seatsById}
              onFocusSeat={onFocusSeat}
            />
          </g>
        </svg>

        {hint && hintSeat && placedById.has(hint.seatId) && (
          <div className={styles.tooltip} style={{ left: hint.left, top: hint.top }} role="presentation">
            <strong>{hintSection ? `אזור ${hintSection.name}` : 'מושב'}</strong>
            <span>
              שורה {hintSeat.rowNumber} · מושב {hintSeat.seatNumber}
            </span>
            {hintSection && <span className={styles.tooltipPrice}>{formatPrice(hintSection.price)}</span>}
            <span
              className={`${styles.tooltipStatus} ${
                selectedIds.has(hintSeat.id) ? styles.stSelected : hintSeat.status === 'Available' ? styles.stFree : styles.stTaken
              }`}
            >
              {selectedIds.has(hintSeat.id) ? '✓ נבחר' : hintSeat.status === 'Available' ? 'פנוי' : '✕ תפוס'}
            </span>
          </div>
        )}

        {message && (
          <div className={styles.toast} role="status">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// The seats themselves – memoized, so hovering / panning does not re-render 2,500 elements.
// One set of handlers on the layer (event delegation) instead of one per seat.
const SeatLayer = memo(function SeatLayer({
  layout,
  seatsById,
  sectionsById,
  sectionStyles,
  selectedIds,
  tabStopId,
  readOnly,
  onClick,
  onKeyDown,
  onPointerOver,
  onFocusSeat,
}: {
  layout: HallLayout;
  seatsById: Map<number, SeatDto>;
  sectionsById: Map<number, SectionDto>;
  sectionStyles: Map<number, SectionStyle>;
  selectedIds: Set<number>;
  tabStopId: number | null;
  readOnly: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPointerOver: (e: ReactPointerEvent) => void;
  onFocusSeat: (id: number) => void;
}) {
  return (
    <g onClick={onClick} onKeyDown={onKeyDown} onPointerOver={onPointerOver}>
      {layout.seats.map(({ seat: placed, x, y, rotate }) => {
        // Current status from the latest server data (the layout itself is cached)
        const seat = seatsById.get(placed.id) ?? placed;
        const section = sectionsById.get(seat.sectionId);
        const color = sectionStyles.get(seat.sectionId)?.color ?? '#5B7C99';
        const selected = selectedIds.has(seat.id);
        const booked = seat.status !== 'Available';
        const cls = [styles.seat, selected ? styles.selected : '', booked ? styles.booked : '', readOnly ? styles.seatReadOnly : '']
          .filter(Boolean)
          .join(' ');

        return (
          <g
            key={seat.id}
            data-seat-id={seat.id}
            className={cls}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)})`}
            role="button"
            tabIndex={seat.id === tabStopId ? 0 : -1}
            aria-pressed={selected}
            aria-disabled={booked || readOnly || undefined}
            aria-label={seatLabel(seat, section, selected)}
            onFocus={() => onFocusSeat(seat.id)}
          >
            <rect
              x={-SEAT_W / 2}
              y={-SEAT_H / 2}
              width={SEAT_W}
              height={SEAT_H}
              rx={3.6}
              fill={booked ? 'var(--seat-booked)' : selected ? 'var(--seat-selected)' : color}
              stroke={selected ? 'var(--seat-selected-ring)' : 'none'}
              strokeWidth={selected ? 2.4 : 0}
            />
            {/* seat back (away from the stage) */}
            {!selected && (
              <rect
                x={-SEAT_W / 2 + 1.5}
                y={SEAT_H / 2 - 3.2}
                width={SEAT_W - 3}
                height={2.2}
                rx={1}
                fill={booked ? 'var(--seat-booked-mark)' : 'rgba(20,36,58,0.28)'}
              />
            )}
            {/* Status is not by color alone: ✕ for taken, ✓ for selected */}
            {booked && <path d="M -3.2 -3.6 L 3.2 2 M 3.2 -3.6 L -3.2 2" className={styles.bookedMark} />}
            {selected && <path d="M -4 -0.6 L -1.2 2.2 L 4.2 -3.4" className={styles.checkMark} />}
          </g>
        );
      })}
    </g>
  );
});

function seatIdFromEvent(target: EventTarget | null): number | null {
  const el = (target as Element | null)?.closest?.('[data-seat-id]');
  return el ? Number(el.getAttribute('data-seat-id')) : null;
}

function firstSeatId(layout: HallLayout): number | null {
  const row = layout.grid.get(1);
  if (!row) return layout.seats[0]?.seat.id ?? null;
  return row.get(1) ?? layout.seats[0]?.seat.id ?? null;
}

function findNeighbor(layout: HallLayout, row: number, seatNumber: number, dRow: number, dSeat: number): number | null {
  const nextRow = row + dRow;
  const rowMap = layout.grid.get(nextRow);
  if (!rowMap) return null;
  const nextSeat = seatNumber + dSeat;
  return rowMap.get(nextSeat) ?? null;
}
