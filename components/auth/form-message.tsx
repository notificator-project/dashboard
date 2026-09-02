import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type FormMessageProps = {
  tone: 'error' | 'success' | 'info';
  children: React.ReactNode;
};

export function FormMessage({ tone, children }: FormMessageProps) {
  const Icon =
    tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div
      className={`form-message ${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon />
      <span>{children}</span>
    </div>
  );
}
