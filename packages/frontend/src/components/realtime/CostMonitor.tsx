import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { RealtimeCost } from '../../hooks/useRealtimeSession';

interface CostMonitorProps {
  cost: RealtimeCost;
  budgetLimit?: number;
}

function budgetTone(percent: number): {
  bar: string;
  text: string;
  warning: string | null;
} {
  if (percent >= 90)
    return {
      bar: 'bg-red-500',
      text: 'text-red-600',
      warning: 'Advertencia: cerca del limite de presupuesto',
    };
  if (percent >= 75)
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-600',
      warning: 'Acercandose al limite de presupuesto',
    };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700', warning: null };
}

export function CostMonitor({ cost, budgetLimit = 1.0 }: CostMonitorProps) {
  const budgetPercent = budgetLimit > 0 ? (cost.totalCostUsd / budgetLimit) * 100 : 0;
  const savingsFromCache = cost.extractionCostUsd * cost.cacheHitRate;
  const tone = budgetTone(budgetPercent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Costos en Tiempo Real</CardTitle>
        <span className={`text-xl font-bold ${tone.text}`}>
          ${cost.totalCostUsd.toFixed(4)}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Transcripcion</p>
            <p className="font-semibold">${cost.transcriptionCostUsd.toFixed(4)}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Extraccion</p>
            <p className="font-semibold">${cost.extractionCostUsd.toFixed(4)}</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-600">
            <span>Presupuesto</span>
            <span>{budgetPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-gray-200">
            <div
              className={`h-full transition-all ${tone.bar}`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            ${Math.max(budgetLimit - cost.totalCostUsd, 0).toFixed(4)} restante
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <div>
            <p className="text-gray-500">Fragmentos</p>
            <p className="font-semibold">{cost.chunksProcessed}</p>
          </div>
          <div>
            <p className="text-gray-500">Cache</p>
            <p className="font-semibold">
              {(cost.cacheHitRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-500">Ahorro</p>
            <p className="font-semibold text-emerald-700">
              ${savingsFromCache.toFixed(4)}
            </p>
          </div>
        </div>

        {tone.warning && (
          <p className={`rounded bg-gray-50 p-2 text-xs ${tone.text}`}>
            {tone.warning}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
