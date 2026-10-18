import { StatusMessage } from '../components/ui/StatusMessage';

export function NotFoundPage() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--sp-8)' }}>
      <StatusMessage
        title="העמוד לא נמצא"
        message="ייתכן שהקישור שגוי או שהעמוד הוסר."
        action={{ label: 'לכל האירועים', to: '/' }}
      />
    </div>
  );
}
