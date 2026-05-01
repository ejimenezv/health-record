import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type {
  RealtimeCurrentSpeaker,
  RealtimeTranscriptChunk,
} from '../../hooks/useRealtimeSession';

interface LiveTranscriptionViewProps {
  transcriptChunks: RealtimeTranscriptChunk[];
  currentSpeaker: RealtimeCurrentSpeaker | null;
  autoScroll?: boolean;
}

const SPEAKER_BADGE_CLASSES: Record<RealtimeCurrentSpeaker['role'], string> = {
  DOCTOR: 'bg-blue-100 text-blue-800',
  PATIENT: 'bg-green-100 text-green-800',
  UNKNOWN: 'bg-gray-100 text-gray-700',
};

const SPEAKER_LABELS: Record<RealtimeCurrentSpeaker['role'], string> = {
  DOCTOR: 'Doctor',
  PATIENT: 'Paciente',
  UNKNOWN: 'Desconocido',
};

const SPEAKER_ICONS: Record<RealtimeCurrentSpeaker['role'], string> = {
  DOCTOR: '👨‍⚕️',
  PATIENT: '👤',
  UNKNOWN: '❓',
};

export function LiveTranscriptionView({
  transcriptChunks,
  currentSpeaker,
  autoScroll = true,
}: LiveTranscriptionViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Sticky bottom: as long as the user is at (or near) the bottom of the
  // transcript box, new fragments scroll the box down to keep the latest
  // visible. The moment the user scrolls up to read earlier text, we
  // stop yanking them back. Reset to sticky when they scroll back to
  // the bottom themselves.
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (!el || !stickToBottomRef.current) return;
    // Why scrollTop, not scrollIntoView: scrollIntoView scrolls the
    // NEAREST scrollable ancestor. Since the page itself scrolls, every
    // new transcript fragment was yanking the entire page down. Setting
    // scrollTop on the container only moves the inner box.
    el.scrollTop = el.scrollHeight;
  }, [transcriptChunks, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // 24 px slack so a tiny natural overscroll doesn't break stickiness.
    stickToBottomRef.current = distanceFromBottom < 24;
  };

  const wordCount = transcriptChunks.reduce(
    (sum, c) => sum + (c.text ? c.text.split(/\s+/).filter(Boolean).length : 0),
    0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Transcripcion en Vivo</CardTitle>
        {currentSpeaker && (
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm font-medium ${
              SPEAKER_BADGE_CLASSES[currentSpeaker.role]
            }`}
          >
            <span aria-hidden>{SPEAKER_ICONS[currentSpeaker.role]}</span>
            <span>{SPEAKER_LABELS[currentSpeaker.role]}</span>
            <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
              {(currentSpeaker.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="max-h-[500px] overflow-y-auto rounded-md bg-gray-50 p-3"
        >
          {transcriptChunks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Esperando transcripcion...
            </p>
          ) : (
            transcriptChunks.map((chunk) => (
              <div
                key={chunk.chunkIndex}
                className={`mb-2 rounded border-l-4 p-2 transition-all ${
                  chunk.isFinal
                    ? 'border-emerald-500 bg-white'
                    : 'border-amber-500 bg-amber-50 italic'
                }`}
              >
                <span>{chunk.text}</span>
                {!chunk.isFinal && (
                  <span className="ml-1 animate-pulse text-gray-400">...</span>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex justify-around border-t pt-3 text-xs text-gray-500">
          <span>Fragmentos: {transcriptChunks.length}</span>
          <span>Palabras: {wordCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
