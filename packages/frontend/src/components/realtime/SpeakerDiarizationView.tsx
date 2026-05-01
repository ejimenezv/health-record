import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { RealtimeCurrentSpeaker } from '../../hooks/useRealtimeSession';

interface SpeakerDiarizationViewProps {
  currentSpeaker: RealtimeCurrentSpeaker | null;
}

const ROLE_DETAILS: Record<
  RealtimeCurrentSpeaker['role'],
  { label: string; classes: string; icon: string }
> = {
  DOCTOR: {
    label: 'Doctor',
    classes: 'bg-blue-50 border-blue-500 text-blue-900',
    icon: '👨‍⚕️',
  },
  PATIENT: {
    label: 'Paciente',
    classes: 'bg-emerald-50 border-emerald-500 text-emerald-900',
    icon: '👤',
  },
  UNKNOWN: {
    label: 'Desconocido',
    classes: 'bg-gray-50 border-gray-400 text-gray-700',
    icon: '❓',
  },
};

export function SpeakerDiarizationView({
  currentSpeaker,
}: SpeakerDiarizationViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hablante Actual</CardTitle>
      </CardHeader>
      <CardContent>
        {currentSpeaker ? (
          <div
            className={`flex items-center gap-3 rounded-md border-l-4 p-3 ${
              ROLE_DETAILS[currentSpeaker.role].classes
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {ROLE_DETAILS[currentSpeaker.role].icon}
            </span>
            <div className="flex-1">
              <p className="font-semibold">
                {ROLE_DETAILS[currentSpeaker.role].label}
              </p>
              <p className="text-xs text-gray-600">ID: {currentSpeaker.id}</p>
            </div>
            <span className="rounded bg-white/70 px-2 py-1 text-xs font-medium">
              {(currentSpeaker.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aun sin hablante detectado</p>
        )}
      </CardContent>
    </Card>
  );
}
