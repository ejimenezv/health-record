# Medical Record Components Specification

## Overview

This document specifies the components used for medical record management within appointments, including the SOAP format sections, symptoms, prescriptions, and diagnosis.

## Component List

| Component | Description | Used In |
|-----------|-------------|---------|
| `MedicalRecordForm` | Main form container | AppointmentPage |
| `SubjectiveSection` | Subjective (S) section | MedicalRecordForm |
| `ObjectiveSection` | Objective (O) section | MedicalRecordForm |
| `AssessmentSection` | Assessment (A) section | MedicalRecordForm |
| `PlanSection` | Plan (P) section | MedicalRecordForm |
| `SymptomsSection` | Symptoms list and management | SubjectiveSection |
| `SymptomCard` | Individual symptom display | SymptomsSection |
| `SymptomModal` | Add/edit symptom form | SymptomsSection |
| `PrescriptionsSection` | Prescriptions list | PlanSection |
| `PrescriptionCard` | Individual prescription | PrescriptionsSection |
| `PrescriptionModal` | Add/edit prescription form | PrescriptionsSection |
| `DiagnosisInput` | Diagnosis input with suggestions | AssessmentSection |
| `AIFieldIndicator` | AI suggestion badge | Various |

## MedicalRecordForm

Main container for the medical record SOAP form.

```typescript
// src/components/medical-records/MedicalRecordForm.tsx

interface MedicalRecordFormProps {
  medicalRecord: MedicalRecord;
  aiSuggestions: AIExtractionResult | null;
  onUpdate: (field: keyof MedicalRecord, value: any) => void;
  onAcceptAISuggestion: (field: string, value: any) => void;
  onDiscardAISuggestion: (field: string) => void;
  disabled?: boolean;
}

export const MedicalRecordForm: React.FC<MedicalRecordFormProps> = ({
  medicalRecord,
  aiSuggestions,
  onUpdate,
  onAcceptAISuggestion,
  onDiscardAISuggestion,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Section navigation (optional) */}
      <div className="flex gap-2 border-b border-secondary-200 pb-2">
        <SectionTab label="Subjetivo" section="subjective" />
        <SectionTab label="Objetivo" section="objective" />
        <SectionTab label="Evaluación" section="assessment" />
        <SectionTab label="Plan" section="plan" />
      </div>

      {/* Subjective Section */}
      <SubjectiveSection
        chiefComplaint={medicalRecord.chiefComplaint}
        historyOfPresentIllness={medicalRecord.historyOfPresentIllness}
        symptoms={medicalRecord.symptoms}
        aiSuggestions={{
          chiefComplaint: aiSuggestions?.chiefComplaint,
          symptoms: aiSuggestions?.symptoms,
        }}
        onUpdate={onUpdate}
        onAcceptAISuggestion={onAcceptAISuggestion}
        onDiscardAISuggestion={onDiscardAISuggestion}
        disabled={disabled}
      />

      {/* Objective Section */}
      <ObjectiveSection
        physicalExamNotes={medicalRecord.physicalExamNotes}
        vitalSigns={medicalRecord.vitalSigns}
        onUpdate={onUpdate}
        disabled={disabled}
      />

      {/* Assessment Section */}
      <AssessmentSection
        diagnosis={medicalRecord.diagnosis}
        diagnosisNotes={medicalRecord.diagnosisNotes}
        aiSuggestions={{
          diagnosis: aiSuggestions?.diagnosis,
        }}
        onUpdate={onUpdate}
        onAcceptAISuggestion={onAcceptAISuggestion}
        onDiscardAISuggestion={onDiscardAISuggestion}
        disabled={disabled}
      />

      {/* Plan Section */}
      <PlanSection
        prescriptions={medicalRecord.prescriptions}
        treatmentPlan={medicalRecord.treatmentPlan}
        followUpInstructions={medicalRecord.followUpInstructions}
        patientEducation={medicalRecord.patientEducation}
        aiSuggestions={{
          prescriptions: aiSuggestions?.prescriptions,
        }}
        onUpdate={onUpdate}
        onAcceptAISuggestion={onAcceptAISuggestion}
        onDiscardAISuggestion={onDiscardAISuggestion}
        disabled={disabled}
      />
    </div>
  );
};
```

## SubjectiveSection

The Subjective (S) section of SOAP notes.

```typescript
// src/components/medical-records/SubjectiveSection.tsx

interface SubjectiveSectionProps {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  symptoms: Symptom[];
  aiSuggestions: {
    chiefComplaint?: AIFieldSuggestion<string>;
    symptoms?: AIFieldSuggestion<Symptom[]>;
  };
  onUpdate: (field: string, value: any) => void;
  onAcceptAISuggestion: (field: string, value: any) => void;
  onDiscardAISuggestion: (field: string) => void;
  disabled?: boolean;
}

export const SubjectiveSection: React.FC<SubjectiveSectionProps> = ({
  chiefComplaint,
  historyOfPresentIllness,
  symptoms,
  aiSuggestions,
  onUpdate,
  onAcceptAISuggestion,
  onDiscardAISuggestion,
  disabled,
}) => {
  return (
    <ContentCard title="Subjetivo">
      {/* Chief Complaint */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Motivo de Consulta</Label>
          {aiSuggestions.chiefComplaint?.status === 'done' && (
            <AIFieldIndicator
              accepted={aiSuggestions.chiefComplaint.accepted}
              onAccept={() =>
                onAcceptAISuggestion('chiefComplaint', aiSuggestions.chiefComplaint.value)
              }
              onDiscard={() => onDiscardAISuggestion('chiefComplaint')}
            />
          )}
        </div>
        <Textarea
          value={chiefComplaint}
          onChange={(e) => onUpdate('chiefComplaint', e.target.value)}
          placeholder="Describa el motivo principal de la consulta..."
          rows={2}
          maxLength={500}
          disabled={disabled}
          className={cn(
            aiSuggestions.chiefComplaint?.status === 'done' &&
            !aiSuggestions.chiefComplaint.accepted &&
            'border-ai-300 bg-ai-50'
          )}
        />
        <CharacterCount current={chiefComplaint.length} max={500} />
      </div>

      {/* History of Present Illness */}
      <div className="mt-4 space-y-2">
        <Label>Historia de la Enfermedad Actual</Label>
        <Textarea
          value={historyOfPresentIllness}
          onChange={(e) => onUpdate('historyOfPresentIllness', e.target.value)}
          placeholder="Describa la evolución de los síntomas..."
          rows={4}
          maxLength={5000}
          disabled={disabled}
        />
      </div>

      {/* Symptoms */}
      <div className="mt-6">
        <SymptomsSection
          symptoms={symptoms}
          aiSymptoms={aiSuggestions.symptoms?.value || []}
          aiStatus={aiSuggestions.symptoms?.status}
          onAdd={(symptom) => onUpdate('symptoms', [...symptoms, symptom])}
          onRemove={(id) => onUpdate('symptoms', symptoms.filter(s => s.id !== id))}
          onUpdate={(id, data) =>
            onUpdate('symptoms', symptoms.map(s => s.id === id ? { ...s, ...data } : s))
          }
          onAcceptAI={() =>
            onAcceptAISuggestion('symptoms', aiSuggestions.symptoms?.value)
          }
          onDiscardAI={() => onDiscardAISuggestion('symptoms')}
          disabled={disabled}
        />
      </div>
    </ContentCard>
  );
};
```

## SymptomsSection

Manages the list of symptoms.

```typescript
// src/components/medical-records/SymptomsSection.tsx

interface SymptomsSectionProps {
  symptoms: Symptom[];
  aiSymptoms: Symptom[];
  aiStatus?: 'pending' | 'processing' | 'done';
  onAdd: (symptom: Symptom) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<Symptom>) => void;
  onAcceptAI: () => void;
  onDiscardAI: () => void;
  disabled?: boolean;
}

export const SymptomsSection: React.FC<SymptomsSectionProps> = ({
  symptoms,
  aiSymptoms,
  aiStatus,
  onAdd,
  onRemove,
  onUpdate,
  onAcceptAI,
  onDiscardAI,
  disabled,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);

  const hasAISuggestions = aiStatus === 'done' && aiSymptoms.length > 0;
  const pendingAISymptoms = aiSymptoms.filter(
    ai => !symptoms.some(s => s.name === ai.name)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-secondary-700">Síntomas</h4>
          {hasAISuggestions && pendingAISymptoms.length > 0 && (
            <Badge variant="ai">{pendingAISymptoms.length} sugeridos</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingSymptom(null);
            setIsModalOpen(true);
          }}
          disabled={disabled}
        >
          <Plus size={14} className="mr-1" />
          Agregar Síntoma
        </Button>
      </div>

      {/* AI Suggestions Banner */}
      {hasAISuggestions && pendingAISymptoms.length > 0 && (
        <div className="mb-3 p-3 bg-ai-50 border border-ai-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-ai-600" />
              <span className="text-sm text-ai-800">
                {pendingAISymptoms.length} síntomas extraídos por IA
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDiscardAI}>
                Descartar
              </Button>
              <Button size="sm" onClick={onAcceptAI}>
                Aceptar Todos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Symptoms List */}
      {symptoms.length === 0 && pendingAISymptoms.length === 0 ? (
        <p className="text-sm text-secondary-500 italic">
          No hay síntomas registrados
        </p>
      ) : (
        <div className="space-y-2">
          {/* Existing symptoms */}
          {symptoms.map((symptom) => (
            <SymptomCard
              key={symptom.id}
              symptom={symptom}
              onEdit={() => {
                setEditingSymptom(symptom);
                setIsModalOpen(true);
              }}
              onRemove={() => onRemove(symptom.id)}
              disabled={disabled}
            />
          ))}

          {/* AI suggested symptoms (not yet accepted) */}
          {pendingAISymptoms.map((symptom) => (
            <SymptomCard
              key={`ai-${symptom.id}`}
              symptom={symptom}
              isAISuggestion
              onAccept={() => onAdd(symptom)}
              onDiscard={() => {/* Remove from AI suggestions */}}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <SymptomModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        symptom={editingSymptom}
        onSubmit={(data) => {
          if (editingSymptom) {
            onUpdate(editingSymptom.id, data);
          } else {
            onAdd({
              id: crypto.randomUUID(),
              ...data,
              isAISuggested: false,
            });
          }
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
```

## SymptomCard

Displays an individual symptom.

```typescript
// src/components/medical-records/SymptomCard.tsx

interface SymptomCardProps {
  symptom: Symptom;
  isAISuggestion?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onAccept?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
}

export const SymptomCard: React.FC<SymptomCardProps> = ({
  symptom,
  isAISuggestion = false,
  onEdit,
  onRemove,
  onAccept,
  onDiscard,
  disabled,
}) => (
  <div
    className={cn(
      'p-3 rounded-lg border',
      isAISuggestion
        ? 'border-ai-200 bg-ai-50'
        : 'border-secondary-200 bg-white'
    )}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-secondary-900">
            {symptom.name}
          </span>
          {symptom.isAISuggested && !isAISuggestion && (
            <Badge variant="ai" className="text-xs">AI</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-3 text-sm text-secondary-600">
          {symptom.bodySite && (
            <span>Ubicación: {symptom.bodySite}</span>
          )}
          {symptom.severity && (
            <span>Severidad: {symptom.severity}/10</span>
          )}
          {symptom.duration && (
            <span>Duración: {symptom.duration}</span>
          )}
        </div>

        {symptom.notes && (
          <p className="mt-2 text-sm text-secondary-500">
            {symptom.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isAISuggestion ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={onAccept}
              disabled={disabled}
              title="Aceptar"
            >
              <Check size={16} className="text-success-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDiscard}
              disabled={disabled}
              title="Descartar"
            >
              <X size={16} className="text-secondary-400" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              disabled={disabled}
              title="Editar"
            >
              <Edit size={16} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onRemove}
              disabled={disabled}
              title="Eliminar"
            >
              <Trash2 size={16} className="text-error-500" />
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
);
```

### Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│ Cefalea                                    [AI] [✏][✗] │
│ Ubicación: Frontal • Severidad: 7/10 • Duración: 2 sem │
│                                                         │
│ Empeora por las tardes. Mejora con descanso.           │
└─────────────────────────────────────────────────────────┘
```

## SymptomModal

Modal for adding or editing symptoms.

```typescript
// src/components/medical-records/SymptomModal.tsx

interface SymptomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symptom: Symptom | null;
  onSubmit: (data: Omit<Symptom, 'id' | 'isAISuggested'>) => void;
}

export const SymptomModal: React.FC<SymptomModalProps> = ({
  open,
  onOpenChange,
  symptom,
  onSubmit,
}) => {
  const form = useForm<SymptomFormData>({
    resolver: zodResolver(symptomSchema),
    defaultValues: symptom || {
      name: '',
      bodySite: '',
      severity: undefined,
      duration: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (symptom) {
      form.reset(symptom);
    } else {
      form.reset({
        name: '',
        bodySite: '',
        severity: undefined,
        duration: '',
        notes: '',
      });
    }
  }, [symptom, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {symptom ? 'Editar Síntoma' : 'Agregar Síntoma'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Symptom Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Síntoma *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cefalea, Náuseas..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Body Site */}
            <FormField
              control={form.control}
              name="bodySite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localización</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Región frontal, Abdomen..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Severity */}
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severidad (1-10)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value || 5]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="flex-1"
                      />
                      <span className="w-8 text-center font-medium">
                        {field.value || '-'}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 2 días, 1 semana..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {symptom ? 'Guardar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

## PrescriptionsSection

Manages the list of prescriptions.

```typescript
// src/components/medical-records/PrescriptionsSection.tsx

interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  aiPrescriptions: Prescription[];
  aiStatus?: 'pending' | 'processing' | 'done';
  onAdd: (prescription: Prescription) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<Prescription>) => void;
  onAcceptAI: () => void;
  onDiscardAI: () => void;
  disabled?: boolean;
}

export const PrescriptionsSection: React.FC<PrescriptionsSectionProps> = ({
  prescriptions,
  aiPrescriptions,
  aiStatus,
  onAdd,
  onRemove,
  onUpdate,
  onAcceptAI,
  onDiscardAI,
  disabled,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  const hasAISuggestions = aiStatus === 'done' && aiPrescriptions.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-secondary-700">Prescripciones</h4>
          {hasAISuggestions && (
            <Badge variant="ai">{aiPrescriptions.length} sugeridas</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingPrescription(null);
            setIsModalOpen(true);
          }}
          disabled={disabled}
        >
          <Plus size={14} className="mr-1" />
          Agregar Prescripción
        </Button>
      </div>

      {/* AI Suggestions Banner */}
      {hasAISuggestions && (
        <div className="mb-3 p-3 bg-ai-50 border border-ai-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-ai-600" />
              <span className="text-sm text-ai-800">
                {aiPrescriptions.length} prescripciones sugeridas por IA
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDiscardAI}>
                Descartar
              </Button>
              <Button size="sm" onClick={onAcceptAI}>
                Aceptar Todas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prescriptions List */}
      {prescriptions.length === 0 ? (
        <p className="text-sm text-secondary-500 italic">
          No hay prescripciones registradas
        </p>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onEdit={() => {
                setEditingPrescription(prescription);
                setIsModalOpen(true);
              }}
              onRemove={() => onRemove(prescription.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <PrescriptionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        prescription={editingPrescription}
        onSubmit={(data) => {
          if (editingPrescription) {
            onUpdate(editingPrescription.id, data);
          } else {
            onAdd({
              id: crypto.randomUUID(),
              ...data,
              isAISuggested: false,
            });
          }
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
```

## PrescriptionCard

Displays an individual prescription.

```typescript
// src/components/medical-records/PrescriptionCard.tsx

interface PrescriptionCardProps {
  prescription: Prescription;
  onEdit: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  prescription,
  onEdit,
  onRemove,
  disabled,
}) => (
  <div className="p-3 rounded-lg border border-secondary-200 bg-white">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Pill size={16} className="text-primary-600" />
          <span className="font-medium text-secondary-900">
            {prescription.medication} {prescription.strength}
          </span>
          {prescription.isAISuggested && (
            <Badge variant="ai" className="text-xs">AI</Badge>
          )}
        </div>

        <div className="mt-1 text-sm text-secondary-600">
          <p>{prescription.dosage} - {prescription.frequency}</p>
          {prescription.duration && (
            <p>Duración: {prescription.duration}</p>
          )}
        </div>

        <p className="mt-2 text-sm text-secondary-700">
          {prescription.instructions}
        </p>

        {prescription.indication && (
          <p className="mt-1 text-sm text-secondary-500">
            Indicación: {prescription.indication}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          disabled={disabled}
          title="Editar"
        >
          <Edit size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          disabled={disabled}
          title="Eliminar"
        >
          <Trash2 size={16} className="text-error-500" />
        </Button>
      </div>
    </div>
  </div>
);
```

### Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│ 💊 Ibuprofeno 400mg                        [AI] [✏][✗] │
│ 1 tableta - Cada 8 horas                               │
│ Duración: 5 días                                       │
│                                                         │
│ Tomar con alimentos para evitar irritación gástrica.   │
│ Indicación: Dolor de cabeza / Migraña                  │
└─────────────────────────────────────────────────────────┘
```

## PrescriptionModal

Modal for adding or editing prescriptions.

```typescript
// src/components/medical-records/PrescriptionModal.tsx

interface PrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription | null;
  onSubmit: (data: Omit<Prescription, 'id' | 'isAISuggested'>) => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  open,
  onOpenChange,
  prescription,
  onSubmit,
}) => {
  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: prescription || defaultPrescriptionValues,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {prescription ? 'Editar Prescripción' : 'Agregar Prescripción'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Medication */}
            <FormField
              control={form.control}
              name="medication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicamento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del medicamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Strength */}
              <FormField
                control={form.control}
                name="strength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concentración *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 400mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dosage */}
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosis *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 1 tableta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Frequency */}
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Cada 8 horas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 5 días" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Refills */}
              <FormField
                control={form.control}
                name="refills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refills</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={12}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Instructions */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucciones *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrucciones para el paciente..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Indication */}
            <FormField
              control={form.control}
              name="indication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indicación</FormLabel>
                  <FormControl>
                    <Input placeholder="Motivo de la prescripción" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {prescription ? 'Guardar' : 'Agregar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

## AIFieldIndicator

Badge indicator for AI-suggested fields.

```typescript
// src/components/medical-records/AIFieldIndicator.tsx

interface AIFieldIndicatorProps {
  status?: 'pending' | 'processing' | 'done';
  accepted?: boolean;
  onAccept?: () => void;
  onDiscard?: () => void;
}

export const AIFieldIndicator: React.FC<AIFieldIndicatorProps> = ({
  status = 'done',
  accepted = false,
  onAccept,
  onDiscard,
}) => {
  if (status === 'pending') {
    return (
      <Badge variant="default" className="gap-1">
        <span className="h-2 w-2 rounded-full bg-secondary-400" />
        Pendiente
      </Badge>
    );
  }

  if (status === 'processing') {
    return (
      <Badge variant="default" className="gap-1">
        <Loader2 size={12} className="animate-spin" />
        Procesando
      </Badge>
    );
  }

  if (accepted) {
    return (
      <Badge variant="ai" className="gap-1">
        <Check size={12} />
        AI Aceptado
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="ai" className="gap-1">
        <Sparkles size={12} />
        AI
      </Badge>
      {onAccept && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onAccept}
          title="Aceptar sugerencia"
        >
          <Check size={14} className="text-success-600" />
        </Button>
      )}
      {onDiscard && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onDiscard}
          title="Descartar sugerencia"
        >
          <X size={14} className="text-secondary-400" />
        </Button>
      )}
    </div>
  );
};
```

## File Structure

```
src/components/medical-records/
├── MedicalRecordForm.tsx
├── SubjectiveSection.tsx
├── ObjectiveSection.tsx
├── AssessmentSection.tsx
├── PlanSection.tsx
├── SymptomsSection.tsx
├── SymptomCard.tsx
├── SymptomModal.tsx
├── PrescriptionsSection.tsx
├── PrescriptionCard.tsx
├── PrescriptionModal.tsx
├── DiagnosisInput.tsx
├── AIFieldIndicator.tsx
├── CharacterCount.tsx
└── index.ts
```
