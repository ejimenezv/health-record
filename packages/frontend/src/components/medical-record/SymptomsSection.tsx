import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';
import { Symptom, CreateSymptomRequest, UpdateSymptomRequest } from '../../types/medical-records.types';

interface SymptomsSectionProps {
  symptoms: Symptom[];
  onAdd: (data: CreateSymptomRequest) => Promise<void>;
  onUpdate: (symptomId: string, data: UpdateSymptomRequest) => Promise<void>;
  onDelete: (symptomId: string) => Promise<void>;
  disabled?: boolean;
}

export function SymptomsSection({
  symptoms,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false,
}: SymptomsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSymptom, setNewSymptom] = useState<CreateSymptomRequest>({
    symptomName: '',
    bodySite: '',
    severity: undefined,
    duration: '',
    notes: '',
  });
  const [editingSymptom, setEditingSymptom] = useState<UpdateSymptomRequest>({});

  const handleAdd = async () => {
    if (!newSymptom.symptomName.trim()) return;
    await onAdd(newSymptom);
    setNewSymptom({ symptomName: '', bodySite: '', severity: undefined, duration: '', notes: '' });
    setIsAdding(false);
  };

  const handleStartEdit = (symptom: Symptom) => {
    setEditingId(symptom.id);
    setEditingSymptom({
      symptomName: symptom.symptomName,
      bodySite: symptom.bodySite ?? '',
      severity: symptom.severity ?? undefined,
      duration: symptom.duration ?? '',
      notes: symptom.notes ?? '',
    });
  };

  const handleUpdate = async (symptomId: string) => {
    await onUpdate(symptomId, editingSymptom);
    setEditingId(null);
    setEditingSymptom({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingSymptom({});
  };

  const getSeverityLabel = (severity?: number | null) => {
    if (!severity) return null;
    if (severity <= 3) return { label: 'Leve', color: 'bg-green-100 text-green-700' };
    if (severity <= 6) return { label: 'Moderado', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Severo', color: 'bg-red-100 text-red-700' };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Sintomas</CardTitle>
        {!disabled && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new symptom form */}
        {isAdding && (
          <div className="p-3 border rounded-lg space-y-3 bg-gray-50">
            <Input
              placeholder="Nombre del sintoma *"
              value={newSymptom.symptomName}
              onChange={(e) => setNewSymptom({ ...newSymptom, symptomName: e.target.value })}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Ubicacion (ej: Frontal)"
                value={newSymptom.bodySite}
                onChange={(e) => setNewSymptom({ ...newSymptom, bodySite: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Severidad (1-10)"
                min={1}
                max={10}
                value={newSymptom.severity ?? ''}
                onChange={(e) =>
                  setNewSymptom({
                    ...newSymptom,
                    severity: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <Input
              placeholder="Duracion (ej: 2 semanas)"
              value={newSymptom.duration}
              onChange={(e) => setNewSymptom({ ...newSymptom, duration: e.target.value })}
            />
            <Textarea
              placeholder="Notas adicionales..."
              value={newSymptom.notes}
              onChange={(e) => setNewSymptom({ ...newSymptom, notes: e.target.value })}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Symptoms list */}
        {symptoms.length === 0 && !isAdding ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay sintomas registrados</p>
        ) : (
          <ul className="space-y-2">
            {symptoms.map((symptom) => (
              <li
                key={symptom.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                {editingId === symptom.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Nombre del sintoma *"
                      value={editingSymptom.symptomName ?? ''}
                      onChange={(e) =>
                        setEditingSymptom({ ...editingSymptom, symptomName: e.target.value })
                      }
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Ubicacion"
                        value={editingSymptom.bodySite ?? ''}
                        onChange={(e) =>
                          setEditingSymptom({ ...editingSymptom, bodySite: e.target.value })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Severidad (1-10)"
                        min={1}
                        max={10}
                        value={editingSymptom.severity ?? ''}
                        onChange={(e) =>
                          setEditingSymptom({
                            ...editingSymptom,
                            severity: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <Input
                      placeholder="Duracion"
                      value={editingSymptom.duration ?? ''}
                      onChange={(e) =>
                        setEditingSymptom({ ...editingSymptom, duration: e.target.value })
                      }
                    />
                    <Textarea
                      placeholder="Notas adicionales..."
                      value={editingSymptom.notes ?? ''}
                      onChange={(e) =>
                        setEditingSymptom({ ...editingSymptom, notes: e.target.value })
                      }
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(symptom.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{symptom.symptomName}</span>
                        {symptom.isAIExtracted && <AIBadge />}
                        {(() => {
                          const severityInfo = getSeverityLabel(symptom.severity);
                          return severityInfo ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${severityInfo.color}`}
                            >
                              {severityInfo.label} ({symptom.severity}/10)
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {(symptom.bodySite || symptom.duration) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {symptom.bodySite && `Ubicacion: ${symptom.bodySite}`}
                          {symptom.bodySite && symptom.duration && ' | '}
                          {symptom.duration && `Duracion: ${symptom.duration}`}
                        </p>
                      )}
                      {symptom.notes && (
                        <p className="text-sm text-gray-500 mt-1 italic">{symptom.notes}</p>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(symptom)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(symptom.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
