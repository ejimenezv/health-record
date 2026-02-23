import { Mic, Square, Pause, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface AudioRecorderProps {
  isRecording: boolean;
  isPaused?: boolean;
  duration: number;
  audioLevel?: number;
  onStart: () => void;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  disabled?: boolean;
  status?: string;
}

export function AudioRecorder({
  isRecording,
  isPaused = false,
  duration,
  audioLevel = 0,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
  status,
}: AudioRecorderProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const levelWidth = Math.min(100, Math.round(audioLevel * 100));

  return (
    <div className="flex flex-col items-center gap-4">
      {isRecording && !isPaused && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${levelWidth}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button onClick={onStart} disabled={disabled} size="lg" className="gap-2">
            <Mic className="h-5 w-5" />
            Iniciar Grabacion
          </Button>
        ) : (
          <>
            {onPause && onResume && (
              <Button
                onClick={isPaused ? onResume : onPause}
                variant="outline"
                size="icon"
                disabled={disabled}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            <Button
              onClick={onStop}
              variant="destructive"
              size="lg"
              className="gap-2"
              disabled={disabled}
            >
              <Square className="h-4 w-4" />
              Detener
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-3 h-3 rounded-full',
              isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
            )}
          />
          <span className="text-lg font-mono">{formatDuration(duration)}</span>
          {isPaused && <span className="text-sm text-yellow-600">(Pausado)</span>}
        </div>
      )}

      {status && <p className="text-sm text-gray-500">{status}</p>}
    </div>
  );
}
