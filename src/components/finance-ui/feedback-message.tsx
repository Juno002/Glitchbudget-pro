import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleX, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'error';

const variantByTone = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
} as const;

const iconByTone = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleX,
} as const;

export function FeedbackMessage({
  tone = 'neutral',
  title,
  description,
  className,
}: {
  tone?: FeedbackTone;
  title?: ReactNode;
  description: ReactNode;
  className?: string;
}) {
  const Icon = iconByTone[tone];
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <Alert
      variant={variantByTone[tone]}
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      data-feedback-tone={tone}
      className={cn(className)}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <div>
        {title ? <AlertTitle>{title}</AlertTitle> : null}
        <AlertDescription>{description}</AlertDescription>
      </div>
    </Alert>
  );
}
