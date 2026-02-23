import { useState, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';

interface DiagnosisSectionProps {
  diagnosis?: string | null;
  diagnosisNotes?: string | null;
  isAIGenerated?: boolean;
  onUpdate: (data: { diagnosis?: string; diagnosisNotes?: string }) => Promise<void>;
  disabled?: boolean;
}

export function DiagnosisSection({
  diagnosis,
  diagnosisNotes,
  isAIGenerated = false,
  onUpdate,
  disabled = false,
}: DiagnosisSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: diagnosis ?? '',
    diagnosisNotes: diagnosisNotes ?? '',
  });

  useEffect(() => {
    setFormData({
      diagnosis: diagnosis ?? '',
      diagnosisNotes: diagnosisNotes ?? '',
    });
  }, [diagnosis, diagnosisNotes]);

  const handleSave = async () => {
    await onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      diagnosis: diagnosis ?? '',
      diagnosisNotes: diagnosisNotes ?? '',
    });
    setIsEditing(false);
  };

  const hasDiagnosis = Boolean(diagnosis);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Diagnostico</CardTitle>
        {!disabled && !isEditing && hasDiagnosis && (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
        {!disabled && !isEditing && !hasDiagnosis && (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Agregar Diagnostico
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Diagnostico *</label>
              <Input
                placeholder="Ingrese el diagnostico..."
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Notas del Diagnostico</label>
              <Textarea
                placeholder="Notas adicionales sobre el diagnostico..."
                value={formData.diagnosisNotes}
                onChange={(e) => setFormData({ ...formData, diagnosisNotes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : hasDiagnosis ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">{diagnosis}</span>
              {isAIGenerated && <AIBadge />}
            </div>
            {diagnosisNotes && (
              <p className="text-sm text-gray-600 mt-2">{diagnosisNotes}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No hay diagnostico registrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
