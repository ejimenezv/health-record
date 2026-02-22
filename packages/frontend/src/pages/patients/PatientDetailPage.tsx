import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatient, useDeletePatient } from '../../hooks/usePatients';
import { usePatientAllergies, useCreateAllergy, useDeleteAllergy } from '../../hooks/useAllergies';
import { usePatientChronicConditions, useCreateChronicCondition, useDeleteChronicCondition } from '../../hooks/useChronicConditions';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import type { AllergySeverity, ChronicConditionStatus } from '../../types/patient.types';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, error } = usePatient(id!);
  const deletePatient = useDeletePatient();

  // Allergies
  const { data: allergies = [] } = usePatientAllergies(id!);
  const createAllergy = useCreateAllergy(id!);
  const deleteAllergy = useDeleteAllergy(id!);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [newAllergen, setNewAllergen] = useState('');
  const [newAllergyReaction, setNewAllergyReaction] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState<AllergySeverity | ''>('');

  // Chronic Conditions
  const { data: chronicConditions = [] } = usePatientChronicConditions(id!);
  const createChronicCondition = useCreateChronicCondition(id!);
  const deleteChronicCondition = useDeleteChronicCondition(id!);
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionStatus, setNewConditionStatus] = useState<ChronicConditionStatus | ''>('active');
  const [newConditionNotes, setNewConditionNotes] = useState('');

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatSeverity = (severity: AllergySeverity | null | undefined): string => {
    const severityMap: Record<AllergySeverity, string> = {
      mild: 'Leve',
      moderate: 'Moderada',
      severe: 'Severa',
      life_threatening: 'Potencialmente mortal',
    };
    return severity ? severityMap[severity] : '';
  };

  const formatConditionStatus = (status: ChronicConditionStatus | null | undefined): string => {
    const statusMap: Record<ChronicConditionStatus, string> = {
      active: 'Activa',
      resolved: 'Resuelta',
      managed: 'Controlada',
    };
    return status ? statusMap[status] : '';
  };

  const handleDelete = async () => {
    if (window.confirm('Esta seguro de eliminar este paciente?')) {
      await deletePatient.mutateAsync(id!);
      navigate('/patients');
    }
  };

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergen.trim()) return;

    await createAllergy.mutateAsync({
      allergen: newAllergen,
      reaction: newAllergyReaction || null,
      severity: newAllergySeverity || null,
    });

    setNewAllergen('');
    setNewAllergyReaction('');
    setNewAllergySeverity('');
    setShowAllergyForm(false);
  };

  const handleDeleteAllergy = async (allergyId: string) => {
    if (window.confirm('Eliminar esta alergia?')) {
      await deleteAllergy.mutateAsync(allergyId);
    }
  };

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConditionName.trim()) return;

    await createChronicCondition.mutateAsync({
      conditionName: newConditionName,
      status: newConditionStatus || 'active',
      notes: newConditionNotes || null,
    });

    setNewConditionName('');
    setNewConditionStatus('active');
    setNewConditionNotes('');
    setShowConditionForm(false);
  };

  const handleDeleteCondition = async (conditionId: string) => {
    if (window.confirm('Eliminar esta condicion cronica?')) {
      await deleteChronicCondition.mutateAsync(conditionId);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-8 text-red-500">
        Paciente no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-600">
            {calculateAge(patient.dateOfBirth)} anos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/patients/${id}/edit`)}>
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informacion de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Email:</strong> {patient.email || 'No registrado'}</p>
            <p><strong>Telefono:</strong> {patient.phone || 'No registrado'}</p>
            <p><strong>Direccion:</strong> {patient.address || 'No registrada'}</p>
          </CardContent>
        </Card>

        {/* Medical Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informacion Medica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Tipo de Sangre:</strong> {patient.bloodType || 'No registrado'}</p>
            <p><strong>Sexo:</strong> {patient.sex === 'male' ? 'Masculino' : patient.sex === 'female' ? 'Femenino' : 'Otro'}</p>
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Alergias</CardTitle>
            <Button size="sm" onClick={() => setShowAllergyForm(!showAllergyForm)}>
              {showAllergyForm ? 'Cancelar' : 'Agregar'}
            </Button>
          </CardHeader>
          <CardContent>
            {showAllergyForm && (
              <form onSubmit={handleAddAllergy} className="mb-4 p-3 bg-gray-50 rounded space-y-3">
                <div>
                  <Label htmlFor="allergen">Alergeno *</Label>
                  <Input
                    id="allergen"
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    placeholder="Ej: Penicilina, Polen, Mariscos..."
                  />
                </div>
                <div>
                  <Label htmlFor="reaction">Reaccion</Label>
                  <Input
                    id="reaction"
                    value={newAllergyReaction}
                    onChange={(e) => setNewAllergyReaction(e.target.value)}
                    placeholder="Ej: Urticaria, Dificultad para respirar..."
                  />
                </div>
                <div>
                  <Label>Severidad</Label>
                  <Select
                    value={newAllergySeverity}
                    onValueChange={(value) => setNewAllergySeverity(value as AllergySeverity)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Leve</SelectItem>
                      <SelectItem value="moderate">Moderada</SelectItem>
                      <SelectItem value="severe">Severa</SelectItem>
                      <SelectItem value="life_threatening">Potencialmente mortal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="sm" disabled={createAllergy.isPending}>
                  {createAllergy.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </form>
            )}
            {allergies.length === 0 ? (
              <p className="text-gray-500">Ninguna registrada</p>
            ) : (
              <ul className="space-y-2">
                {allergies.map((allergy) => (
                  <li key={allergy.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{allergy.allergen}</p>
                      {allergy.reaction && (
                        <p className="text-sm text-gray-600">Reaccion: {allergy.reaction}</p>
                      )}
                      {allergy.severity && (
                        <p className="text-sm text-gray-600">Severidad: {formatSeverity(allergy.severity)}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAllergy(allergy.id)}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Chronic Conditions */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Condiciones Cronicas</CardTitle>
            <Button size="sm" onClick={() => setShowConditionForm(!showConditionForm)}>
              {showConditionForm ? 'Cancelar' : 'Agregar'}
            </Button>
          </CardHeader>
          <CardContent>
            {showConditionForm && (
              <form onSubmit={handleAddCondition} className="mb-4 p-3 bg-gray-50 rounded space-y-3">
                <div>
                  <Label htmlFor="conditionName">Nombre de la Condicion *</Label>
                  <Input
                    id="conditionName"
                    value={newConditionName}
                    onChange={(e) => setNewConditionName(e.target.value)}
                    placeholder="Ej: Diabetes, Hipertension, Asma..."
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={newConditionStatus}
                    onValueChange={(value) => setNewConditionStatus(value as ChronicConditionStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="managed">Controlada</SelectItem>
                      <SelectItem value="resolved">Resuelta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="conditionNotes">Notas</Label>
                  <Input
                    id="conditionNotes"
                    value={newConditionNotes}
                    onChange={(e) => setNewConditionNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                  />
                </div>
                <Button type="submit" size="sm" disabled={createChronicCondition.isPending}>
                  {createChronicCondition.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </form>
            )}
            {chronicConditions.length === 0 ? (
              <p className="text-gray-500">Ninguna registrada</p>
            ) : (
              <ul className="space-y-2">
                {chronicConditions.map((condition) => (
                  <li key={condition.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{condition.conditionName}</p>
                      {condition.status && (
                        <p className="text-sm text-gray-600">Estado: {formatConditionStatus(condition.status)}</p>
                      )}
                      {condition.notes && (
                        <p className="text-sm text-gray-600">Notas: {condition.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteCondition(condition.id)}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contacto de Emergencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Nombre:</strong> {patient.emergencyContactName || 'No registrado'}</p>
            <p><strong>Telefono:</strong> {patient.emergencyContactPhone || 'No registrado'}</p>
            {patient.emergencyContactRelationship && (
              <p><strong>Relacion:</strong> {patient.emergencyContactRelationship}</p>
            )}
          </CardContent>
        </Card>

        {/* Appointments History */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Historial de Citas</CardTitle>
            <Button size="sm" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
              Nueva Cita
            </Button>
          </CardHeader>
          <CardContent>
            {!patient.appointments || patient.appointments.length === 0 ? (
              <p className="text-gray-500">Sin citas registradas</p>
            ) : (
              <ul className="space-y-2">
                {patient.appointments.map((apt) => (
                  <li
                    key={apt.id}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                  >
                    <p className="font-medium">
                      {new Date(apt.appointmentDate).toLocaleDateString('es-MX')}
                    </p>
                    <p className="text-sm text-gray-600">{apt.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PatientDetailPage;
