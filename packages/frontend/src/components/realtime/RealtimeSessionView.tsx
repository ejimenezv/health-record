import { useRealtimeSession } from '../../hooks/useRealtimeSession';
import { Button } from '../ui/button';
import { LiveTranscriptionView } from './LiveTranscriptionView';
import { ValidationAlertPanel } from './ValidationAlertPanel';
import { SpeakerDiarizationView } from './SpeakerDiarizationView';
import { EntityExtractionView } from './EntityExtractionView';

export interface RealtimeSessionViewProps {
  patientId?: string;
  appointmentId?: string;
  appointmentType?: string;
  specialty?: string;
  /** When true, render without page chrome (min-h-screen + outer header)
   * so the view can be embedded inside an existing page. */
  embedded?: boolean;
}

export function RealtimeSessionView({
  patientId,
  appointmentId,
  appointmentType,
  specialty,
  embedded = false,
}: RealtimeSessionViewProps) {
  const session = useRealtimeSession();

  const handleStart = async () => {
    await session.createSession({
      patientId,
      appointmentId,
      appointmentType,
      specialty,
    });
    await session.startRecording();
  };

  const handleStop = async () => {
    await session.stopRecording();
  };

  const handleResume = async () => {
    await session.resumeRecording();
  };

  const handleFinalize = async () => {
    await session.finalizeSession();
  };

  const wrapperClass = embedded ? '' : 'min-h-screen bg-gray-50';
  const headerClass = embedded
    ? 'flex items-center justify-between rounded-md border bg-white px-4 py-3'
    : 'flex items-center justify-between border-b bg-white px-6 py-4';
  const bodyPadding = embedded ? 'gap-6 py-4 lg:grid-cols-[2fr_1fr]' : 'gap-6 p-6 lg:grid-cols-[2fr_1fr]';
  const errorPadding = embedded ? 'mt-3' : 'mx-6 mt-4';
  const finalPadding = embedded ? 'mt-4' : 'mx-6 mb-6';

  return (
    <div className={wrapperClass}>
      <header className={headerClass}>
        <h1 className="text-lg font-semibold">Consulta en Tiempo Real</h1>
        <div className="flex items-center gap-3">
          {session.status === 'idle' && (
            <Button onClick={handleStart}>Iniciar Consulta</Button>
          )}
          {session.status === 'connecting' && (
            <span className="text-sm text-gray-500">Conectando...</span>
          )}
          {session.status === 'recording' && (
            <>
              <Button variant="destructive" onClick={handleStop}>
                Detener Grabacion
              </Button>
              <Button variant="outline" onClick={handleFinalize}>
                Finalizar
              </Button>
              <div className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                GRABANDO
              </div>
            </>
          )}
          {session.status === 'paused' && (
            <>
              <Button onClick={handleResume}>Reanudar Grabacion</Button>
              <Button variant="outline" onClick={handleFinalize}>
                Finalizar
              </Button>
              <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                PAUSADO
              </div>
            </>
          )}
          {session.status === 'processing' && (
            <span className="text-sm text-gray-500">Procesando...</span>
          )}
          {session.status === 'completed' && (
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              ✓ Completada
            </span>
          )}
          {session.status === 'error' && (
            <span className="rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
              Error
            </span>
          )}
        </div>
      </header>

      {session.error && (
        <div className={`${errorPadding} rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800`}>
          {session.error}
        </div>
      )}

      {session.status !== 'idle' && (
        <div className={`grid ${bodyPadding}`}>
          <div className="space-y-6">
            <LiveTranscriptionView
              transcriptChunks={session.transcriptChunks}
              currentSpeaker={session.currentSpeaker}
            />
            <ValidationAlertPanel
              alerts={session.alerts}
              onAcknowledge={session.acknowledgeAlert}
            />
          </div>
          <div className="space-y-6">
            <SpeakerDiarizationView currentSpeaker={session.currentSpeaker} />
            {/* CostMonitor hidden until CostTracker is wired into the AI
                service (see docs/guides/realtime-operational-notes.md).
                Backend currently emits $0.00 for every cost field; showing
                that to a doctor is worse than showing nothing. */}
            <EntityExtractionView entities={session.entities} />
          </div>
        </div>
      )}

      {session.status === 'completed' && (
        <div className={`${finalPadding} space-y-4 rounded-lg border bg-white p-6`}>
          <h2 className="text-lg font-semibold">Resultados Finales</h2>
          {session.finalTranscript && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Transcripcion Completa
              </h3>
              <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                {session.finalTranscript}
              </p>
            </div>
          )}
          {session.finalCostSummary && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Resumen de Sesion
              </h3>
              <ul className="text-sm text-gray-700">
                <li>
                  Duracion de audio:{' '}
                  {session.finalCostSummary.audio_duration_seconds}s
                </li>
              </ul>
              {/* Cost fields hidden until CostTracker is wired into the AI
                  service. See docs/guides/realtime-operational-notes.md. */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
