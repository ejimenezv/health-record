import { useState, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useTranscription } from '../../hooks/useTranscription';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { AIExtractionStatus } from './AIExtractionStatus';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import type { AIExtractionResult } from '../../types/medical-records.types';

interface TranscriptionPanelProps {
  appointmentId: string;
  onExtractionUpdate: (extraction: AIExtractionResult) => void;
  disabled?: boolean;
}

export function TranscriptionPanel({
  appointmentId,
  onExtractionUpdate,
  disabled = false,
}: TranscriptionPanelProps) {
  const [transcriptionText, setTranscriptionText] = useState('');
  const [extraction, setExtraction] = useState<AIExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptionUpdate = useCallback((_text: string, fullText: string) => {
    setTranscriptionText(fullText);
  }, []);

  const handleFieldExtraction = useCallback(
    (ext: AIExtractionResult) => {
      console.log('Received extraction:', ext);
      setExtraction(ext);
      onExtractionUpdate(ext);
    },
    [onExtractionUpdate]
  );

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const { isConnected, status, startSession, sendAudioChunk, stopSession, cancelSession, waitForPendingChunks } =
    useTranscription({
      appointmentId,
      onTranscriptionUpdate: handleTranscriptionUpdate,
      onFieldExtraction: handleFieldExtraction,
      onError: handleError,
    });

  const {
    isRecording,
    isPaused,
    duration,
    error: recorderError,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useAudioRecorder({
    onChunkReady: sendAudioChunk,
    chunkDuration: 15000, // 15 seconds for better transcription accuracy
  });

  const handleStart = async () => {
    setError(null);
    setTranscriptionText('');
    setExtraction(null);
    startSession();
    await startRecording();
  };

  const handleStop = async () => {
    // Wait for final chunk to be captured and sent
    await stopRecording();
    // Wait for all pending chunks to be transcribed before stopping session
    await waitForPendingChunks();
    stopSession();
  };

  const handleCancel = () => {
    stopRecording();
    cancelSession();
    setTranscriptionText('');
    setExtraction(null);
  };

  const displayError = error || recorderError;

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Conectando...';
      case 'recording':
        return 'Grabando y transcribiendo...';
      case 'processing':
        return 'Procesando...';
      case 'completed':
        return 'Transcripcion completada';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-semibold text-lg">Transcripcion con IA</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Wifi className="h-4 w-4" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <WifiOff className="h-4 w-4" /> Desconectado
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        <AudioRecorder
          isRecording={isRecording}
          isPaused={isPaused}
          duration={duration}
          audioLevel={audioLevel}
          onStart={handleStart}
          onStop={handleStop}
          onPause={pauseRecording}
          onResume={resumeRecording}
          disabled={disabled || !isConnected || status === 'processing'}
          status={getStatusMessage()}
        />

        {isRecording && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancelar grabacion
            </Button>
          </div>
        )}

        <TranscriptionDisplay
          text={transcriptionText}
          isLive={isRecording && !isPaused}
          maxHeight={200}
        />

        {(isRecording || status === 'processing' || status === 'completed' || extraction) && (
          <AIExtractionStatus
            symptoms={
              extraction?.symptoms?.length
                ? 'done'
                : isRecording || status === 'processing'
                  ? 'extracting'
                  : 'pending'
            }
            diagnosis={
              extraction?.diagnosis
                ? 'done'
                : isRecording || status === 'processing'
                  ? 'extracting'
                  : 'pending'
            }
            prescriptions={
              extraction?.prescriptions?.length
                ? 'done'
                : isRecording || status === 'processing'
                  ? 'extracting'
                  : 'pending'
            }
            symptomsCount={extraction?.symptoms?.length || 0}
            prescriptionsCount={extraction?.prescriptions?.length || 0}
          />
        )}

        {extraction?.summary && (
          <div className="text-sm bg-blue-50 p-3 rounded-lg">
            <strong className="text-blue-700">Resumen IA:</strong>
            <p className="mt-1 text-gray-700">{extraction.summary}</p>
          </div>
        )}

        {status === 'processing' && !extraction?.summary && (
          <div className="text-sm bg-gray-50 p-3 rounded-lg animate-pulse">
            <strong className="text-gray-500">Generando resumen...</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
