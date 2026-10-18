import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEventsList } from '../hooks/useEvents';
import { EVENTS_PAGE_SIZE } from '../config';
import type { EventDto, EventQuery, EventSortBy } from '../types/api';
import { EventCard, AvailabilityBadge } from '../components/events/EventCard';
import { EventImage } from '../components/events/EventImage';
import { Pagination } from '../components/ui/Pagination';
import { StatusMessage } from '../components/ui/StatusMessage';
import { Spinner } from '../components/ui/Spinner';
import { toApiError } from '../api/errors';
import {
  formatLongDate,
  formatPrice,
  formatTime,
  isPast,
  localDayEndToUtc,
  localDayStartToUtc,
} from '../utils/format';
import { ArrowDown, ArrowLeft, Armchair, CalendarDays, MapPin, RotateCcw, Search, ShieldCheck, Zap } from 'lucide-react';
import { HeroHall } from '../components/home/HeroHall';
import styles from './HomePage.module.css';

const SORT_OPTIONS: Array<{ value: string; label: string; sortBy: EventSortBy; descending: boolean }> = [
  { value: 'date-asc', label: 'מועד – הקרוב קודם', sortBy: 'date', descending: false },
  { value: 'date-desc', label: 'מועד – הרחוק קודם', sortBy: 'date', descending: true },
  { value: 'name-asc', label: 'שם – א׳ עד ת׳', sortBy: 'name', descending: false },
  { value: 'name-desc', label: 'שם – ת׳ עד א׳', sortBy: 'name', descending: true },
];

export function HomePage() {
  return (
    <>
      <Hero />
      <Featured />
      <Catalog />
    </>
  );
}

// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>הזמנת מושבים לאירועים</p>
          <h1 className={styles.heroTitle}>
            המקום שלך באולם.
            <br />
            <span>בדיוק איפה שבחרת.</span>
          </h1>
          <p className={styles.heroSub}>
            מגלים אירוע, רואים את מפת האולם האמיתית עם הזמינות העדכנית, בוחרים מושב מסוים – ומקבלים אישור מיידי.
          </p>
          <div className={styles.heroActions}>
            <a href="#catalog" className={styles.heroCta}>
              לכל האירועים
              <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <ul className={styles.features}>
            <li>
              <Armchair size={18} aria-hidden="true" />
              מפת אולם אמיתית – רואים בדיוק איפה יושבים
            </li>
            <li>
              <Zap size={18} aria-hidden="true" />
              זמינות מתעדכנת מהשרת בזמן אמת
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              הגנה מפני הזמנה כפולה של אותו מושב
            </li>
          </ul>
        </div>
        <div className={styles.heroArt}>
          <HeroHall />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The nearest upcoming events (the server sorts upcoming first, nearest first)
function Featured() {
  const { data, isLoading } = useEventsList({ page: 1, pageSize: 4, sortBy: 'date', descending: false });
  const upcoming = (data?.items ?? []).filter((e) => !isPast(e.startDate));

  if (isLoading) {
    return (
      <section className={`container ${styles.featuredSection}`}>
        <div className={styles.featuredSkeleton} />
      </section>
    );
  }
  if (upcoming.length === 0) return null;

  const [main, ...rest] = upcoming;

  return (
    <section className={`container ${styles.featuredSection}`} aria-labelledby="featured-title">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>בקרוב</p>
        <h2 id="featured-title" className={styles.sectionTitle}>
          האירוע הקרוב
        </h2>
      </div>
      <div className={styles.featuredGrid}>
        <FeaturedEvent event={main} />
        {rest.length > 0 && (
          <ul className={styles.nextList}>
            {rest.map((e) => (
              <li key={e.id}>
                <Link to={`/events/${e.id}`} className={styles.nextItem}>
                  <EventImage src={e.imageUrl} alt={e.name} seed={e.id} className={styles.nextImage} />
                  <span className={styles.nextText}>
                    <span className={styles.nextDate}>
                      {formatLongDate(e.startDate)} · {formatTime(e.startDate)}
                    </span>
                    <strong>{e.name}</strong>
                    <span className={styles.nextPlace}>{e.place}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FeaturedEvent({ event }: { event: EventDto }) {
  return (
    <Link to={`/events/${event.id}`} className={styles.featured}>
      <EventImage src={event.imageUrl} alt={event.name} seed={event.id} className={styles.featuredImage} eager />
      <div className={styles.featuredOverlay}>
        <AvailabilityBadge event={event} />
        <h3 className={styles.featuredTitle}>{event.name}</h3>
        <p className={styles.featuredMeta}>
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            {formatLongDate(event.startDate)} · {formatTime(event.startDate)}
          </span>
          <span>
            <MapPin size={16} aria-hidden="true" />
            {event.place}
          </span>
        </p>
        <div className={styles.featuredFooter}>
          {event.totalSeats > 0 && <span className={styles.featuredPrice}>החל מ-{formatPrice(event.minPrice)}</span>}
          <span className={styles.featuredCta}>
            לבחירת מושבים
            <ArrowLeft size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// The full catalog: search / dates / sort / pages – all done by the SERVER (EventQueryDto).
// The filters live in the URL, so a filtered page can be shared or refreshed.
function Catalog() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const name = params.get('q') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sortValue = SORT_OPTIONS.some((o) => o.value === params.get('sort')) ? params.get('sort')! : 'date-asc';
  const sort = SORT_OPTIONS.find((o) => o.value === sortValue)!;

  // Typing is debounced so the server is not called on every key
  const [nameInput, setNameInput] = useState(name);
  useEffect(() => setNameInput(name), [name]);
  useEffect(() => {
    if (nameInput.trim() === name) return;
    const t = window.setTimeout(() => update({ q: nameInput.trim() }), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameInput]);

  const query: EventQuery = useMemo(
    () => ({
      page,
      pageSize: EVENTS_PAGE_SIZE,
      name: name || undefined,
      fromDate: from ? localDayStartToUtc(from) : undefined,
      toDate: to ? localDayEndToUtc(to) : undefined,
      sortBy: sort.sortBy,
      descending: sort.descending,
    }),
    [page, name, from, to, sort],
  );

  const { data, isLoading, isError, error, isFetching, refetch, isPlaceholderData } = useEventsList(query);

  function update(changes: Record<string, string>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        // Any filter change starts again from page 1
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  }

  const hasFilters = !!(name || from || to || sortValue !== 'date-asc');
  const dateError = from && to && from > to ? 'תאריך הסיום מוקדם מתאריך ההתחלה' : null;

  const goToPage = (p: number) => {
    update({ page: String(p) });
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="catalog" className={`container ${styles.catalog}`} aria-labelledby="catalog-title">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>לוח האירועים</p>
        <h2 id="catalog-title" className={styles.sectionTitle}>
          כל האירועים
        </h2>
      </div>

      <form className={styles.toolbar} role="search" onSubmit={(e) => e.preventDefault()}>
        <label className={styles.searchField}>
          <span className="sr-only">חיפוש לפי שם האירוע</span>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            placeholder="חיפוש לפי שם האירוע"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className={styles.filter}>
          <span>מתאריך</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} />
        </label>
        <label className={styles.filter}>
          <span>עד תאריך</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} />
        </label>
        <label className={styles.filter}>
          <span>מיון</span>
          <select value={sortValue} onChange={(e) => update({ sort: e.target.value === 'date-asc' ? '' : e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setNameInput('');
              setParams({}, { replace: true });
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            איפוס
          </button>
        )}
      </form>

      <div className={styles.resultsBar} aria-live="polite">
        {dateError ? (
          <span className={styles.dateError}>{dateError}</span>
        ) : data ? (
          <span>
            {data.totalCount === 0 ? 'לא נמצאו אירועים' : `נמצאו ${data.totalCount} אירועים`}
            {data.totalPages > 1 && ` · עמוד ${data.page} מתוך ${data.totalPages}`}
          </span>
        ) : (
          <span />
        )}
        {isFetching && !isLoading && <Spinner size={16} />}
        <span className={styles.sortNote}>אירועים עתידיים מוצגים לפני אירועים שהסתיימו</span>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      ) : isError ? (
        <StatusMessage
          tone="danger"
          title="לא הצלחנו לטעון את האירועים"
          message={toApiError(error).message}
          action={{ label: 'ניסיון נוסף', onClick: () => refetch() }}
        />
      ) : data && data.items.length === 0 ? (
        <StatusMessage
          title={hasFilters ? 'אין אירועים שמתאימים לחיפוש' : 'עדיין אין אירועים'}
          message={hasFilters ? 'נסו לשנות את מילות החיפוש או את טווח התאריכים.' : 'אירועים חדשים יופיעו כאן ברגע שיפורסמו.'}
          action={hasFilters ? { label: 'איפוס החיפוש', onClick: () => setParams({}, { replace: true }) } : undefined}
        />
      ) : (
        data && (
          <>
            <ul className={`${styles.grid} ${isPlaceholderData ? styles.dim : ''}`}>
              {data.items.map((e) => (
                <li key={e.id}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} disabled={isFetching} />
          </>
        )
      )}
    </section>
  );
}
