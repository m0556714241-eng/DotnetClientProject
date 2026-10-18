import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm, useWatch, type Path } from 'react-hook-form';
import { useEventDetails, useSaveEvent } from '../../hooks/useEvents';
import { toApiError } from '../../api/errors';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_ROWS, MAX_SEATS_PER_ROW } from '../../config';
import type { EventDetailsDto, EventInput, SectionInput } from '../../types/api';
import { localDateTimeToUtc, utcToLocalDateTimeInput } from '../../utils/format';
import { buildSectionStyles } from '../../utils/sectionColors';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Alert, StatusMessage } from '../../components/ui/StatusMessage';
import { PageLoader } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toastContext';
import { EventImage } from '../../components/events/EventImage';
import shell from '../PageShell.module.css';
import styles from './Admin.module.css';

// Form values: numbers come from <input type="number"> (valueAsNumber)
interface FormValues {
  name: string;
  place: string;
  description: string;
  startDate: string; // datetime-local (local time)
  rowsCount: number;
  seatsPerRow: number;
  sections: SectionInput[];
}

const EMPTY: FormValues = {
  name: '',
  place: '',
  description: '',
  startDate: '',
  rowsCount: 10,
  seatsPerRow: 12,
  sections: [
    { name: 'VIP', price: 250, fromRow: 1, toRow: 3 },
    { name: 'אולם', price: 120, fromRow: 4, toRow: 10 },
  ],
};

export function AdminEventFormPage() {
  const { id } = useParams();
  const eventId = id ? Number(id) : undefined;
  const isEdit = eventId !== undefined;
  const { data: event, isLoading, isError, error } = useEventDetails(eventId ?? 0);

  if (isEdit && isLoading) return <PageLoader label="טוענים את האירוע…" />;
  if (isEdit && (isError || !event)) {
    return (
      <div className={`container ${shell.page}`}>
        <StatusMessage
          tone="danger"
          title="לא הצלחנו לטעון את האירוע"
          message={toApiError(error).message}
          action={{ label: 'חזרה לניהול', to: '/admin' }}
        />
      </div>
    );
  }

  return <EventForm key={event?.id ?? 'new'} event={isEdit ? event : undefined} />;
}

function toFormValues(event: EventDetailsDto): FormValues {
  return {
    name: event.name,
    place: event.place,
    description: event.description ?? '',
    startDate: utcToLocalDateTimeInput(event.startDate),
    rowsCount: event.rowsCount,
    seatsPerRow: event.seatsPerRow,
    sections: [...event.sections]
      .sort((a, b) => a.fromRow - b.fromRow)
      .map(({ name, price, fromRow, toRow }) => ({ name, price, fromRow, toRow })),
  };
}

// The same rules as EventService.ValidateLayout – checked here too, so the admin sees the problem at once
function validateSections(sections: SectionInput[], rowsCount: number): string | true {
  if (sections.length === 0) return 'יש להגדיר לפחות אזור אחד';
  const names = sections.map((s) => s.name.trim().toLowerCase());
  const dup = names.find((n, i) => n && names.indexOf(n) !== i);
  if (dup) return `שם האזור "${dup}" מופיע יותר מפעם אחת`;
  const sorted = [...sections].sort((a, b) => a.fromRow - b.fromRow);
  let expected = 1;
  for (const s of sorted) {
    if (s.fromRow > s.toRow) return `באזור "${s.name}" שורת ההתחלה גדולה משורת הסיום`;
    if (s.toRow > rowsCount) return `האזור "${s.name}" חורג מהאולם (${rowsCount} שורות)`;
    if (s.fromRow < expected) return `האזור "${s.name}" חופף לאזור הקודם`;
    if (s.fromRow > expected) return `שורות ${expected}–${s.fromRow - 1} אינן שייכות לאף אזור`;
    expected = s.toRow + 1;
  }
  if (expected <= rowsCount) return `שורות ${expected}–${rowsCount} אינן שייכות לאף אזור`;
  return true;
}

function EventForm({ event }: { event?: EventDetailsDto }) {
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveEvent();
  const [formError, setFormError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: event ? toFormValues(event) : EMPTY, mode: 'onBlur' });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
    rules: { validate: (sections) => validateSections(sections, Number(getValues('rowsCount')) || 0) },
  });

  const rowsCount = useWatch({ control, name: 'rowsCount' });
  const seatsPerRow = useWatch({ control, name: 'seatsPerRow' });
  const watchedSections = useWatch({ control, name: 'sections' });
  const booked = event ? event.totalSeats - event.availableSeats : 0;

  const onPickImage = (file: File | undefined) => {
    setImageError(null);
    if (!file) return setImage(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return setImageError('מותרות רק תמונות JPEG, PNG או WEBP');
    if (file.size > MAX_IMAGE_BYTES) return setImageError('התמונה חייבת להיות עד 2MB');
    setImage(file);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const dto: EventInput = {
      name: values.name.trim(),
      place: values.place.trim(),
      description: values.description.trim() || null,
      startDate: localDateTimeToUtc(values.startDate),
      rowsCount: Number(values.rowsCount),
      seatsPerRow: Number(values.seatsPerRow),
      sections: values.sections.map((s) => ({
        name: s.name.trim(),
        price: Number(s.price),
        fromRow: Number(s.fromRow),
        toRow: Number(s.toRow),
      })),
    };

    try {
      const { saved, imageError: uploadError } = await save.mutateAsync({ id: event?.id, dto, image });
      if (uploadError) {
        toast.show(`האירוע נשמר, אבל התמונה לא הועלתה: ${toApiError(uploadError).message}`, 'danger');
        navigate(`/admin/events/${saved.id}/edit`, { replace: true });
        return;
      }
      toast.show(event ? 'האירוע עודכן' : 'האירוע נוצר');
      navigate('/admin');
    } catch (e) {
      const apiError = toApiError(e);
      let matched = false;
      for (const [key, message] of Object.entries(apiError.fieldErrors)) {
        setError(key as Path<FormValues>, { type: 'server', message });
        matched = true;
      }
      setFormError(matched && apiError.status === 400 ? 'יש לתקן את השדות המסומנים' : apiError.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const sectionStyles = useMemo(
    () => buildSectionStyles((watchedSections ?? []).map((s, i) => ({ id: i, name: s.name, price: Number(s.price), fromRow: 0, toRow: 0 }))),
    [watchedSections],
  );

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className={shell.eyebrow}>
          <Link to="/admin">ניהול אירועים</Link> /
        </p>
        <h1 className={shell.title}>{event ? `עריכת "${event.name}"` : 'אירוע חדש'}</h1>
      </header>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <Alert>{formError}</Alert>}

        <fieldset className={styles.card}>
          <legend>פרטי האירוע</legend>
          <div className={styles.grid2}>
            <TextField
              label="שם האירוע"
              error={errors.name?.message}
              {...register('name', {
                required: 'שדה חובה',
                validate: (v) => v.trim().length > 0 || 'שדה חובה',
                maxLength: { value: 200, message: 'עד 200 תווים' },
              })}
            />
            <TextField
              label="מקום"
              error={errors.place?.message}
              {...register('place', {
                required: 'שדה חובה',
                validate: (v) => v.trim().length > 0 || 'שדה חובה',
                maxLength: { value: 200, message: 'עד 200 תווים' },
              })}
            />
            <TextField
              label="מועד (שעון מקומי)"
              type="datetime-local"
              error={errors.startDate?.message}
              {...register('startDate', {
                required: 'שדה חובה',
                // Like the server: the "future" rule is checked only when the date was changed
                validate: (v) =>
                  (!!event && v === utcToLocalDateTimeInput(event.startDate)) ||
                  new Date(v).getTime() > Date.now() ||
                  'מועד האירוע חייב להיות בעתיד',
              })}
            />
          </div>
          <TextAreaField
            label="תיאור"
            hint="עד 2000 תווים"
            error={errors.description?.message}
            {...register('description', { maxLength: { value: 2000, message: 'עד 2000 תווים' } })}
          />
        </fieldset>

        <fieldset className={styles.card}>
          <legend>תמונה</legend>
          <div className={styles.imageRow}>
            <div className={styles.imagePreview}>
              {preview ? (
                <img src={preview} alt="תצוגה מקדימה של התמונה החדשה" />
              ) : (
                <EventImage src={event?.imageUrl} alt="התמונה הנוכחית" seed={event?.id ?? 0} />
              )}
            </div>
            <div className={styles.imageControls}>
              <label className={styles.fileLabel}>
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                <span>{image ? image.name : event?.imageUrl ? 'החלפת תמונה' : 'בחירת תמונה'}</span>
              </label>
              <p className={styles.help}>JPEG, PNG או WEBP, עד 2MB. התמונה מועלית אחרי שמירת האירוע.</p>
              {image && (
                <button type="button" className={styles.linkBtn} onClick={() => setImage(null)}>
                  ביטול בחירת התמונה
                </button>
              )}
              {imageError && <Alert>{imageError}</Alert>}
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.card}>
          <legend>האולם ואזורי המחיר</legend>
          {booked > 0 && (
            <Alert tone="warning">
              לאירוע הזה כבר יש הזמנות ({booked} מושבים). אפשר לעדכן פרטים ומועד, אבל השרת לא יאפשר לשנות את גודל האולם או את האזורים.
            </Alert>
          )}
          <div className={styles.grid2}>
            <TextField
              label="מספר שורות"
              type="number"
              min={1}
              max={MAX_ROWS}
              error={errors.rowsCount?.message}
              {...register('rowsCount', {
                valueAsNumber: true,
                required: 'שדה חובה',
                min: { value: 1, message: 'לפחות 1' },
                max: { value: MAX_ROWS, message: `עד ${MAX_ROWS}` },
              })}
            />
            <TextField
              label="מושבים בכל שורה"
              type="number"
              min={1}
              max={MAX_SEATS_PER_ROW}
              error={errors.seatsPerRow?.message}
              {...register('seatsPerRow', {
                valueAsNumber: true,
                required: 'שדה חובה',
                min: { value: 1, message: 'לפחות 1' },
                max: { value: MAX_SEATS_PER_ROW, message: `עד ${MAX_SEATS_PER_ROW}` },
              })}
            />
          </div>
          <p className={styles.help}>
            סה״כ {Number(rowsCount) * Number(seatsPerRow) || 0} מושבים. כל אזור מכסה טווח שורות; האזורים צריכים לכסות את כל השורות בלי חפיפה.
          </p>

          <div className={styles.sections}>
            {fields.map((field, index) => (
              <div key={field.id} className={styles.sectionRow}>
                <span
                  className={styles.sectionSwatch}
                  style={{ background: sectionStyles.get(index)?.color }}
                  aria-hidden="true"
                />
                <TextField
                  label="שם האזור"
                  error={errors.sections?.[index]?.name?.message}
                  {...register(`sections.${index}.name`, {
                    required: 'שדה חובה',
                    maxLength: { value: 100, message: 'עד 100 תווים' },
                  })}
                />
                <TextField
                  label="מחיר (₪)"
                  type="number"
                  min={0}
                  step="any"
                  error={errors.sections?.[index]?.price?.message}
                  {...register(`sections.${index}.price`, {
                    valueAsNumber: true,
                    required: 'שדה חובה',
                    min: { value: 0, message: 'לא שלילי' },
                    max: { value: 100000, message: 'עד 100,000' },
                  })}
                />
                <TextField
                  label="משורה"
                  type="number"
                  min={1}
                  error={errors.sections?.[index]?.fromRow?.message}
                  {...register(`sections.${index}.fromRow`, {
                    valueAsNumber: true,
                    required: 'שדה חובה',
                    min: { value: 1, message: 'לפחות 1' },
                    max: { value: MAX_ROWS, message: `עד ${MAX_ROWS}` },
                  })}
                />
                <TextField
                  label="עד שורה"
                  type="number"
                  min={1}
                  error={errors.sections?.[index]?.toRow?.message}
                  {...register(`sections.${index}.toRow`, {
                    valueAsNumber: true,
                    required: 'שדה חובה',
                    min: { value: 1, message: 'לפחות 1' },
                    max: { value: MAX_ROWS, message: `עד ${MAX_ROWS}` },
                  })}
                />
                <button
                  type="button"
                  className={styles.removeSection}
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label={`הסרת אזור ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {errors.sections?.root?.message && <Alert>{errors.sections.root.message}</Alert>}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const last = getValues('sections').reduce((m, s) => Math.max(m, Number(s.toRow) || 0), 0);
              const rows = Number(getValues('rowsCount')) || 1;
              append({ name: '', price: 0, fromRow: Math.min(last + 1, rows), toRow: rows });
            }}
          >
            + הוספת אזור
          </Button>

          <RowsPreview rows={Number(rowsCount) || 0} sections={watchedSections ?? []} colors={sectionStyles} />
        </fieldset>

        <div className={styles.formActions}>
          <Button type="submit" size="lg" loading={isSubmitting}>
            {event ? 'שמירת השינויים' : 'יצירת האירוע'}
          </Button>
          <Link to="/admin" className={styles.linkBtn}>
            ביטול
          </Link>
        </div>
      </form>
    </div>
  );
}

// A strip of the hall rows, colored by the zone that covers each row – gaps and overlaps are obvious at a glance
function RowsPreview({
  rows,
  sections,
  colors,
}: {
  rows: number;
  sections: SectionInput[];
  colors: Map<number, { color: string }>;
}) {
  if (rows < 1 || rows > MAX_ROWS) return null;
  const cells = Array.from({ length: rows }, (_, i) => {
    const row = i + 1;
    const covering = sections
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => row >= Number(s.fromRow) && row <= Number(s.toRow));
    return { row, covering };
  });

  return (
    <div className={styles.preview}>
      <p className={styles.help}>שורות האולם (1 = הקרובה לבמה)</p>
      <div className={styles.previewRows}>
        {cells.map(({ row, covering }) => (
          <span
            key={row}
            className={`${styles.previewCell} ${covering.length === 0 ? styles.gapCell : ''} ${covering.length > 1 ? styles.overlapCell : ''}`}
            style={covering.length === 1 ? { background: colors.get(covering[0].idx)?.color } : undefined}
            title={
              covering.length === 0
                ? `שורה ${row}: לא שייכת לאף אזור`
                : covering.length > 1
                  ? `שורה ${row}: חופפת בין אזורים`
                  : `שורה ${row}: ${covering[0].s.name}`
            }
          >
            {row}
          </span>
        ))}
      </div>
    </div>
  );
}
