import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { RealtimeEntity } from '../../hooks/useRealtimeSession';

interface EntityExtractionViewProps {
  entities: RealtimeEntity[];
  showNewIndicator?: boolean;
}

const ENTITY_ICON: Record<string, string> = {
  symptom: '🤒',
  diagnosis: '🏥',
  prescription: '💊',
  vital_sign: '📊',
  allergy: '⚠️',
  procedure: '🔬',
};

const ENTITY_LABEL: Record<string, string> = {
  symptom: 'Sintoma',
  diagnosis: 'Diagnostico',
  prescription: 'Prescripcion',
  vital_sign: 'Signo Vital',
  allergy: 'Alergia',
  procedure: 'Procedimiento',
};

const VALIDATION_LABEL: Record<string, string> = {
  approved: '✓ Aprobada',
  flagged: '⚠ Marcada',
  needs_review: '📋 Revisar',
};

const VALIDATION_CLASSES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  flagged: 'bg-red-100 text-red-800',
  needs_review: 'bg-amber-100 text-amber-800',
};

function confidenceClasses(confidence: number): string {
  if (confidence >= 0.9) return 'bg-blue-100 text-blue-800';
  if (confidence >= 0.7) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function EntityExtractionView({
  entities,
  showNewIndicator = true,
}: EntityExtractionViewProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!showNewIndicator) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [showNewIndicator]);

  const grouped = entities.reduce<Record<string, RealtimeEntity[]>>(
    (acc, entity) => {
      const bucket = acc[entity.type] ?? (acc[entity.type] = []);
      bucket.push(entity);
      return acc;
    },
    {}
  );

  const isNew = (timestamp: number) =>
    showNewIndicator && now - timestamp * 1000 < 3000;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Entidades Extraidas</CardTitle>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold">
          {entities.length} total
        </span>
      </CardHeader>
      <CardContent>
        {entities.length === 0 ? (
          <div className="py-10 text-center">
            <span className="block text-3xl">⏳</span>
            <p className="mt-2 text-sm text-gray-500">
              Esperando extraccion de entidades...
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] space-y-4 overflow-y-auto">
            {Object.entries(grouped).map(([type, typeEntities]) => (
              <div key={type}>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span aria-hidden>{ENTITY_ICON[type] ?? '📝'}</span>
                  <span>{ENTITY_LABEL[type] ?? type}</span>
                  <span className="text-xs font-normal text-gray-500">
                    ({typeEntities.length})
                  </span>
                </h4>
                <div className="space-y-2">
                  {typeEntities.map((entity) => {
                    const isFresh = isNew(entity.timestamp);
                    return (
                      <div
                        key={entity.id}
                        className={`relative rounded-md border bg-gray-50 p-3 transition-all ${
                          isFresh ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                        }`}
                      >
                        <p className="text-sm text-gray-800">{entity.content}</p>
                        {entity.speaker && (
                          <p className="mt-1 text-xs text-gray-500">
                            👤 {entity.speaker}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${confidenceClasses(
                              entity.confidence
                            )}`}
                          >
                            {(entity.confidence * 100).toFixed(0)}% confianza
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              VALIDATION_CLASSES[
                                entity.validationStatus ?? ''
                              ] ?? 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {VALIDATION_LABEL[entity.validationStatus ?? ''] ??
                              '⏳ Pendiente'}
                          </span>
                        </div>
                        {isFresh && (
                          <span className="absolute -right-2 -top-2 rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                            NUEVO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
