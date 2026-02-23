import { Check, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

type FieldStatus = 'pending' | 'extracting' | 'done' | 'error';

interface AIExtractionStatusProps {
  symptoms: FieldStatus;
  diagnosis: FieldStatus;
  prescriptions: FieldStatus;
  symptomsCount?: number;
  prescriptionsCount?: number;
}

export function AIExtractionStatus({
  symptoms,
  diagnosis,
  prescriptions,
  symptomsCount = 0,
  prescriptionsCount = 0,
}: AIExtractionStatusProps) {
  const getStatusIcon = (status: FieldStatus) => {
    switch (status) {
      case 'done':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'extracting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-300" />;
    }
  };

  const getStatusColor = (status: FieldStatus) => {
    switch (status) {
      case 'done':
        return 'border-green-200 bg-green-50';
      case 'extracting':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Sparkles className="h-4 w-4 text-blue-500" />
        Extraccion con IA
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded border text-sm',
            getStatusColor(symptoms)
          )}
        >
          {getStatusIcon(symptoms)}
          <span>
            Sintomas {symptoms === 'done' && symptomsCount > 0 && `(${symptomsCount})`}
          </span>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded border text-sm',
            getStatusColor(diagnosis)
          )}
        >
          {getStatusIcon(diagnosis)}
          <span>Diagnostico</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded border text-sm',
            getStatusColor(prescriptions)
          )}
        >
          {getStatusIcon(prescriptions)}
          <span>
            Recetas {prescriptions === 'done' && prescriptionsCount > 0 && `(${prescriptionsCount})`}
          </span>
        </div>
      </div>
    </div>
  );
}
