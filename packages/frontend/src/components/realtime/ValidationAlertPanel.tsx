import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import type { RealtimeAlert } from '../../hooks/useRealtimeSession';

interface ValidationAlertPanelProps {
  alerts: RealtimeAlert[];
  onAcknowledge: (alertId: string) => void;
}

const SEVERITY_ORDER: RealtimeAlert['severity'][] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
];

const SEVERITY_ICON: Record<RealtimeAlert['severity'], string> = {
  CRITICAL: '🚨',
  HIGH: '⚠️',
  MEDIUM: '⚡',
  LOW: 'ℹ️',
};

const SEVERITY_CARD_CLASSES: Record<RealtimeAlert['severity'], string> = {
  CRITICAL: 'border-red-600 bg-red-50',
  HIGH: 'border-amber-500 bg-amber-50',
  MEDIUM: 'border-blue-500 bg-blue-50',
  LOW: 'border-gray-400 bg-gray-50',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  drug_interaction: 'Interaccion Medicamentosa',
  allergy_conflict: 'Conflicto de Alergias',
  dosage_error: 'Error de Dosificacion',
  contraindication: 'Contraindicacion',
  missing_info: 'Informacion Faltante',
};

export function ValidationAlertPanel({
  alerts,
  onAcknowledge,
}: ValidationAlertPanelProps) {
  const grouped = alerts.reduce<Record<string, RealtimeAlert[]>>((acc, alert) => {
    const bucket = acc[alert.severity] ?? (acc[alert.severity] = []);
    bucket.push(alert);
    return acc;
  }, {});

  const criticalCount = grouped.CRITICAL?.length ?? 0;
  const highCount = grouped.HIGH?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Alertas de Validacion</CardTitle>
        <div className="flex gap-3 text-xs">
          <span className="font-semibold text-red-600">
            {criticalCount} Criticas
          </span>
          <span className="font-semibold text-amber-600">{highCount} Altas</span>
          <span className="text-gray-500">Total: {alerts.length}</span>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-10 text-center">
            <span className="block text-3xl">✅</span>
            <p className="mt-2 text-sm text-gray-500">
              No hay alertas de validacion
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-4 overflow-y-auto">
            {SEVERITY_ORDER.map((severity) =>
              grouped[severity] ? (
                <div key={severity}>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    {SEVERITY_ICON[severity]} {severity}
                  </h4>
                  <div className="space-y-2">
                    {grouped[severity].map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-md border-l-4 p-3 transition-opacity ${
                          SEVERITY_CARD_CLASSES[alert.severity]
                        } ${alert.acknowledged ? 'opacity-60' : ''}`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {SEVERITY_ICON[alert.severity]}{' '}
                            {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
                          </span>
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAcknowledge(alert.id)}
                            >
                              Reconocer
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{alert.message}</p>
                        {alert.recommendedAction && (
                          <p className="mt-2 text-xs">
                            <strong>Accion recomendada:</strong>{' '}
                            {alert.recommendedAction}
                          </p>
                        )}
                        {alert.requiresImmediateAttention && (
                          <div className="mt-2 rounded bg-amber-100 p-1.5 text-center text-xs font-semibold text-amber-900">
                            ⚡ Requiere Atencion Inmediata
                          </div>
                        )}
                        {alert.relatedEntities.length > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            Entidades relacionadas: {alert.relatedEntities.length}
                          </p>
                        )}
                        {alert.acknowledged && (
                          <div className="mt-2 text-xs font-medium text-emerald-700">
                            ✓ Reconocida
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
