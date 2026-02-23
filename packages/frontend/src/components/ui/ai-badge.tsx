import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIBadgeProps {
  className?: string;
  confidence?: number;
}

export function AIBadge({ className, confidence }: AIBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700',
        className
      )}
      title={confidence ? `Confianza: ${Math.round(confidence * 100)}%` : 'Generado por IA'}
    >
      <Sparkles className="h-3 w-3" />
      IA
      {confidence !== undefined && (
        <span className="ml-1">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}
