import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Pill } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';
import {
  Prescription,
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
} from '../../types/medical-records.types';

interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  onAdd: (data: CreatePrescriptionRequest) => Promise<void>;
  onUpdate: (prescriptionId: string, data: UpdatePrescriptionRequest) => Promise<void>;
  onDelete: (prescriptionId: string) => Promise<void>;
  disabled?: boolean;
}

const emptyPrescription: CreatePrescriptionRequest = {
  medicationName: '',
  strength: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: undefined,
  refills: 0,
  instructions: '',
  indication: '',
};

export function PrescriptionsSection({
  prescriptions,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false,
}: PrescriptionsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrescription, setNewPrescription] =
    useState<CreatePrescriptionRequest>(emptyPrescription);
  const [editingPrescription, setEditingPrescription] = useState<UpdatePrescriptionRequest>({});

  const handleAdd = async () => {
    if (
      !newPrescription.medicationName.trim() ||
      !newPrescription.dosage.trim() ||
      !newPrescription.frequency.trim() ||
      !newPrescription.instructions.trim()
    ) {
      return;
    }
    await onAdd(newPrescription);
    setNewPrescription(emptyPrescription);
    setIsAdding(false);
  };

  const handleStartEdit = (prescription: Prescription) => {
    setEditingId(prescription.id);
    setEditingPrescription({
      medicationName: prescription.medicationName,
      strength: prescription.strength ?? '',
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration ?? '',
      quantity: prescription.quantity ?? undefined,
      refills: prescription.refills,
      instructions: prescription.instructions,
      indication: prescription.indication ?? '',
    });
  };

  const handleUpdate = async (prescriptionId: string) => {
    await onUpdate(prescriptionId, editingPrescription);
    setEditingId(null);
    setEditingPrescription({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingPrescription({});
  };

  const renderPrescriptionForm = (
    data: CreatePrescriptionRequest | UpdatePrescriptionRequest,
    setData: (data: CreatePrescriptionRequest | UpdatePrescriptionRequest) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="p-3 border rounded-lg space-y-3 bg-gray-50">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Medicamento *"
          value={data.medicationName ?? ''}
          onChange={(e) => setData({ ...data, medicationName: e.target.value })}
          autoFocus
        />
        <Input
          placeholder="Concentracion (ej: 500mg)"
          value={data.strength ?? ''}
          onChange={(e) => setData({ ...data, strength: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Dosis * (ej: 1 tableta)"
          value={data.dosage ?? ''}
          onChange={(e) => setData({ ...data, dosage: e.target.value })}
        />
        <Input
          placeholder="Frecuencia * (ej: Cada 8 horas)"
          value={data.frequency ?? ''}
          onChange={(e) => setData({ ...data, frequency: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Duracion (ej: 7 dias)"
          value={data.duration ?? ''}
          onChange={(e) => setData({ ...data, duration: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Cantidad"
          min={1}
          value={data.quantity ?? ''}
          onChange={(e) =>
            setData({
              ...data,
              quantity: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <Input
          type="number"
          placeholder="Refills"
          min={0}
          value={data.refills ?? ''}
          onChange={(e) =>
            setData({
              ...data,
              refills: e.target.value ? parseInt(e.target.value) : 0,
            })
          }
        />
      </div>
      <Textarea
        placeholder="Instrucciones * (ej: Tomar con alimentos)"
        value={data.instructions ?? ''}
        onChange={(e) => setData({ ...data, instructions: e.target.value })}
        rows={2}
      />
      <Input
        placeholder="Indicacion (ej: Dolor de cabeza)"
        value={data.indication ?? ''}
        onChange={(e) => setData({ ...data, indication: e.target.value })}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}>
          <Check className="h-4 w-4 mr-1" />
          Guardar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Recetas
        </CardTitle>
        {!disabled && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new prescription form */}
        {isAdding &&
          renderPrescriptionForm(
            newPrescription,
            setNewPrescription as (
              data: CreatePrescriptionRequest | UpdatePrescriptionRequest
            ) => void,
            handleAdd,
            () => {
              setIsAdding(false);
              setNewPrescription(emptyPrescription);
            }
          )}

        {/* Prescriptions list */}
        {prescriptions.length === 0 && !isAdding ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay recetas registradas</p>
        ) : (
          <ul className="space-y-2">
            {prescriptions.map((prescription) => (
              <li key={prescription.id} className="p-3 bg-gray-50 rounded-lg">
                {editingId === prescription.id ? (
                  renderPrescriptionForm(
                    editingPrescription,
                    setEditingPrescription,
                    () => handleUpdate(prescription.id),
                    handleCancelEdit
                  )
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {prescription.medicationName}
                          {prescription.strength && ` ${prescription.strength}`}
                        </span>
                        {prescription.isAIExtracted && <AIBadge />}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {prescription.dosage} - {prescription.frequency}
                        {prescription.duration && ` por ${prescription.duration}`}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{prescription.instructions}</p>
                      {prescription.indication && (
                        <p className="text-sm text-gray-500 mt-1">
                          Indicacion: {prescription.indication}
                        </p>
                      )}
                      {(prescription.quantity || prescription.refills > 0) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {prescription.quantity && `Cantidad: ${prescription.quantity}`}
                          {prescription.quantity && prescription.refills > 0 && ' | '}
                          {prescription.refills > 0 && `Refills: ${prescription.refills}`}
                        </p>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(prescription)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(prescription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
