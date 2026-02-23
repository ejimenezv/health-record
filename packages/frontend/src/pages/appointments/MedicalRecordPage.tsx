import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { SymptomsSection } from '../../components/medical-record/SymptomsSection';
import { DiagnosisSection } from '../../components/medical-record/DiagnosisSection';
import { PrescriptionsSection } from '../../components/medical-record/PrescriptionsSection';
import { TranscriptionPanel } from '../../components/transcription/TranscriptionPanel';
import { useAppointment, useUpdateAppointmentStatus } from '../../hooks/useAppointments';
import {
  useMedicalRecord,
  usePatchMedicalRecord,
  useCompleteRecord,
  useAddSymptom,
  useUpdateSymptom,
  useDeleteSymptom,
  useAddPrescription,
  useUpdatePrescription,
  useDeletePrescription,
} from '../../hooks/useMedicalRecord';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PatchMedicalRecordRequest, AIExtractionResult, MedicalRecord } from '../../types/medical-records.types';
import type { AppointmentStatus } from '../../types/appointment.types';

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function MedicalRecordPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: appointment, isLoading: appointmentLoading } = useAppointment(appointmentId!);
  const {
    data: medicalRecord,
    isLoading: recordLoading,
    refetch,
  } = useMedicalRecord(appointmentId!);

  const updateStatus = useUpdateAppointmentStatus();
  const patchRecord = usePatchMedicalRecord();
  const completeRecord = useCompleteRecord();

  // Mutation hooks for symptoms and prescriptions
  const addSymptom = useAddSymptom();
  const updateSymptom = useUpdateSymptom(appointmentId!);
  const deleteSymptom = useDeleteSymptom(appointmentId!);
  const addPrescription = useAddPrescription();
  const updatePrescription = useUpdatePrescription(appointmentId!);
  const deletePrescription = useDeletePrescription(appointmentId!);

  // Local form state for SOAP notes
  const [formData, setFormData] = useState<PatchMedicalRecordRequest>({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamNotes: '',
    treatmentPlan: '',
    followUpInstructions: '',
    patientEducation: '',
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Keep a ref to always have the latest medical record data
  const medicalRecordRef = useRef<MedicalRecord | null | undefined>(medicalRecord);
  useEffect(() => {
    medicalRecordRef.current = medicalRecord;
  }, [medicalRecord]);

  // Initialize form data from medical record
  useEffect(() => {
    if (medicalRecord) {
      setFormData({
        chiefComplaint: medicalRecord.chiefComplaint ?? '',
        historyOfPresentIllness: medicalRecord.historyOfPresentIllness ?? '',
        physicalExamNotes: medicalRecord.physicalExamNotes ?? '',
        treatmentPlan: medicalRecord.treatmentPlan ?? '',
        followUpInstructions: medicalRecord.followUpInstructions ?? '',
        patientEducation: medicalRecord.patientEducation ?? '',
      });
    }
  }, [medicalRecord]);

  const handleFormChange = (field: keyof PatchMedicalRecordRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await patchRecord.mutateAsync({ appointmentId: appointmentId!, data: formData });
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving medical record:', error);
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  }, [appointmentId, formData, hasUnsavedChanges, patchRecord]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, handleSave]);

  const handleStartAppointment = async () => {
    await updateStatus.mutateAsync({ id: appointmentId!, status: 'in_progress' as AppointmentStatus });
    refetch();
  };

  const handleCompleteAppointment = async () => {
    // Save any pending changes first
    if (hasUnsavedChanges) {
      await handleSave();
    }

    try {
      await completeRecord.mutateAsync(appointmentId!);
      navigate(`/appointments/${appointmentId}`);
    } catch (error) {
      console.error('Error completing appointment:', error);
      alert('Error al completar la consulta. Asegurese de que el diagnostico este registrado.');
    }
  };

  const handleDiagnosisUpdate = async (data: { diagnosis?: string; diagnosisNotes?: string }) => {
    await patchRecord.mutateAsync({ appointmentId: appointmentId!, data });
    refetch();
  };

  const handleExtractionUpdate = useCallback(
    async (extraction: AIExtractionResult) => {
      // Refetch to get the latest data before processing
      const { data: freshData } = await refetch();

      // Use fresh data from refetch, falling back to ref (which is more current than closure)
      const currentRecord = freshData ?? medicalRecordRef.current;
      const existingSymptoms = currentRecord?.symptoms || [];
      const existingPrescriptions = currentRecord?.prescriptions || [];

      console.log('handleExtractionUpdate - existing symptoms:', existingSymptoms.map(s => s.symptomName));
      console.log('handleExtractionUpdate - extraction symptoms:', extraction.symptoms.map(s => s.description));

      // Process symptoms: update existing or add new
      for (const symptom of extraction.symptoms) {
        // Find existing symptom by name (case-insensitive)
        const existingSymptom = existingSymptoms.find(
          (existing) => existing.symptomName.toLowerCase() === symptom.description.toLowerCase()
        );

        const severityValue = symptom.severity === 'mild' ? 3 : symptom.severity === 'moderate' ? 5 : symptom.severity === 'severe' ? 8 : undefined;
        const notesValue = symptom.onset ? `Inicio: ${symptom.onset}` : undefined;

        if (existingSymptom) {
          console.log(`Symptom "${symptom.description}" already exists, checking for updates`);
          // Update existing symptom if new extraction has more info
          const hasNewInfo =
            (severityValue && !existingSymptom.severity) ||
            (symptom.duration && !existingSymptom.duration) ||
            (notesValue && !existingSymptom.notes);

          if (hasNewInfo) {
            try {
              await updateSymptom.mutateAsync({
                symptomId: existingSymptom.id,
                data: {
                  severity: severityValue ?? existingSymptom.severity ?? undefined,
                  duration: symptom.duration ?? existingSymptom.duration ?? undefined,
                  notes: notesValue ?? existingSymptom.notes ?? undefined,
                },
              });
            } catch (error) {
              console.error('Failed to update symptom:', error);
            }
          }
        } else {
          console.log(`Symptom "${symptom.description}" is new, adding`);
          // Add new symptom
          try {
            await addSymptom.mutateAsync({
              appointmentId: appointmentId!,
              data: {
                symptomName: symptom.description,
                severity: severityValue,
                duration: symptom.duration,
                notes: notesValue,
                isAIExtracted: true,
              },
            });
          } catch (error) {
            console.error('Failed to add symptom:', error);
          }
        }
      }

      // Always update diagnosis with latest extraction (replace existing)
      if (extraction.diagnosis) {
        try {
          await patchRecord.mutateAsync({
            appointmentId: appointmentId!,
            data: {
              diagnosis: extraction.diagnosis.description,
              diagnosisNotes: extraction.diagnosis.icdCode
                ? `ICD: ${extraction.diagnosis.icdCode}`
                : undefined,
              isAIGenerated: true,
            },
          });
        } catch (error) {
          console.error('Failed to set diagnosis:', error);
        }
      }

      // Auto-fill chief complaint if available (only if not already set)
      if (extraction.chiefComplaint) {
        setFormData((prev) => ({
          ...prev,
          chiefComplaint: prev.chiefComplaint || extraction.chiefComplaint || '',
        }));
        setHasUnsavedChanges(true);
      }

      console.log('handleExtractionUpdate - existing prescriptions:', existingPrescriptions.map(p => p.medicationName));
      console.log('handleExtractionUpdate - extraction prescriptions:', extraction.prescriptions.map(p => p.medication));

      // Process prescriptions: update existing or add new
      for (const prescription of extraction.prescriptions) {
        // Find existing prescription by medication name (case-insensitive)
        const existingPrescription = existingPrescriptions.find(
          (existing) => existing.medicationName.toLowerCase() === prescription.medication.toLowerCase()
        );

        if (existingPrescription) {
          console.log(`Prescription "${prescription.medication}" already exists, checking for updates`);
          // Update existing prescription if new extraction has more info
          const hasNewInfo =
            (prescription.dosage && !existingPrescription.dosage) ||
            (prescription.frequency && !existingPrescription.frequency) ||
            (prescription.duration && !existingPrescription.duration) ||
            (prescription.instructions && !existingPrescription.instructions);

          if (hasNewInfo) {
            try {
              await updatePrescription.mutateAsync({
                prescriptionId: existingPrescription.id,
                data: {
                  dosage: prescription.dosage ?? existingPrescription.dosage,
                  frequency: prescription.frequency ?? existingPrescription.frequency,
                  duration: prescription.duration ?? existingPrescription.duration ?? undefined,
                  instructions: prescription.instructions ?? existingPrescription.instructions ?? undefined,
                },
              });
            } catch (error) {
              console.error('Failed to update prescription:', error);
            }
          }
        } else {
          console.log(`Prescription "${prescription.medication}" is new, adding`);
          // Add new prescription
          try {
            await addPrescription.mutateAsync({
              appointmentId: appointmentId!,
              data: {
                medicationName: prescription.medication,
                dosage: prescription.dosage,
                frequency: prescription.frequency,
                duration: prescription.duration,
                instructions: prescription.instructions || 'Tomar según indicaciones',
                isAIExtracted: true,
              },
            });
          } catch (error) {
            console.error('Failed to add prescription:', error);
          }
        }
      }

      // Refetch to update UI with all changes
      refetch();
    },
    [appointmentId, addSymptom, updateSymptom, addPrescription, updatePrescription, patchRecord, refetch]
  );

  const isLoading = appointmentLoading || recordLoading;
  const isCompleted =
    appointment?.status === 'completed' || appointment?.status === 'cancelled';
  const isInProgress = appointment?.status === 'in_progress';
  const canEdit = isInProgress && !isCompleted;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!appointment) {
    return <div className="text-center py-8 text-red-500">Cita no encontrada</div>;
  }

  const { patient } = appointment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-600">
            {new Date(appointment.appointmentDate).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="text-sm text-gray-500">Guardando...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600">Guardado</span>
          )}

          {canEdit && hasUnsavedChanges && (
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          )}

          {appointment.status === 'scheduled' && (
            <Button onClick={handleStartAppointment}>Iniciar Consulta</Button>
          )}
          {appointment.status === 'checked_in' && (
            <Button onClick={handleStartAppointment}>Iniciar Consulta</Button>
          )}
          {isInProgress && (
            <Button onClick={handleCompleteAppointment}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Completar Consulta
            </Button>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Informacion del Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Edad:</span> {calculateAge(patient.dateOfBirth)} anos
          </div>
          <div>
            <span className="text-gray-500">Telefono:</span> {patient.phone}
          </div>
          {appointment.reasonForVisit && (
            <div className="col-span-2 md:col-span-3">
              <span className="text-gray-500">Motivo de consulta:</span>{' '}
              {appointment.reasonForVisit}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Transcription Panel - Only show when appointment is in progress */}
      {isInProgress && !isCompleted && (
        <TranscriptionPanel
          appointmentId={appointmentId!}
          onExtractionUpdate={handleExtractionUpdate}
          disabled={!canEdit}
        />
      )}

      {/* Show message if appointment not started */}
      {!isInProgress && !isCompleted && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <p>Inicie la consulta para comenzar a documentar el expediente medico.</p>
          </CardContent>
        </Card>
      )}

      {/* Medical Record Sections - Only show if in progress or completed */}
      {(isInProgress || isCompleted) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Subjective & Objective */}
          <div className="space-y-6">
            {/* Chief Complaint */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Motivo de Consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describa el motivo principal de la consulta..."
                  value={formData.chiefComplaint}
                  onChange={(e) => handleFormChange('chiefComplaint', e.target.value)}
                  disabled={!canEdit}
                  rows={2}
                />
              </CardContent>
            </Card>

            {/* History of Present Illness */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Historia de la Enfermedad Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describa la evolucion de los sintomas..."
                  value={formData.historyOfPresentIllness}
                  onChange={(e) => handleFormChange('historyOfPresentIllness', e.target.value)}
                  disabled={!canEdit}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Symptoms */}
            <SymptomsSection
              symptoms={medicalRecord?.symptoms || []}
              onAdd={async (data) => {
                await addSymptom.mutateAsync({ appointmentId: appointmentId!, data });
              }}
              onUpdate={async (symptomId, data) => {
                await updateSymptom.mutateAsync({ symptomId, data });
              }}
              onDelete={async (symptomId) => {
                await deleteSymptom.mutateAsync(symptomId);
              }}
              disabled={!canEdit}
            />

            {/* Physical Exam */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Examen Fisico</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Hallazgos del examen fisico..."
                  value={formData.physicalExamNotes}
                  onChange={(e) => handleFormChange('physicalExamNotes', e.target.value)}
                  disabled={!canEdit}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assessment & Plan */}
          <div className="space-y-6">
            {/* Diagnosis */}
            <DiagnosisSection
              diagnosis={medicalRecord?.diagnosis}
              diagnosisNotes={medicalRecord?.diagnosisNotes}
              isAIGenerated={medicalRecord?.isAIGenerated}
              onUpdate={handleDiagnosisUpdate}
              disabled={!canEdit}
            />

            {/* Prescriptions */}
            <PrescriptionsSection
              prescriptions={medicalRecord?.prescriptions || []}
              onAdd={async (data) => {
                await addPrescription.mutateAsync({ appointmentId: appointmentId!, data });
              }}
              onUpdate={async (prescriptionId, data) => {
                await updatePrescription.mutateAsync({ prescriptionId, data });
              }}
              onDelete={async (prescriptionId) => {
                await deletePrescription.mutateAsync(prescriptionId);
              }}
              disabled={!canEdit}
            />

            {/* Treatment Plan */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Plan de Tratamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Plan de tratamiento..."
                  value={formData.treatmentPlan}
                  onChange={(e) => handleFormChange('treatmentPlan', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Follow-up Instructions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Indicaciones de Seguimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Instrucciones de seguimiento para el paciente..."
                  value={formData.followUpInstructions}
                  onChange={(e) => handleFormChange('followUpInstructions', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Patient Education */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Educacion al Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Informacion educativa para el paciente..."
                  value={formData.patientEducation}
                  onChange={(e) => handleFormChange('patientEducation', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalRecordPage;
