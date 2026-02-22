# Real-time Auto-fill Specification: MedRecord AI

This document specifies the real-time auto-fill functionality for populating medical record forms with AI-extracted data, including state management, UI update strategies, and user interaction patterns.

---

## Overview

The auto-fill system takes AI-extracted medical information and populates form fields in real-time. It maintains clear distinction between AI-suggested and human-edited content, allowing doctors to review, accept, modify, or reject suggestions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Auto-fill Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐                    ┌────────────────────────────────┐│
│  │  Extracted Fields │───────────────────▶│  Medical Record Form           ││
│  │  (from GPT-4)     │                    │                                ││
│  └───────────────────┘                    │  ┌────────────────────────────┐││
│                                           │  │ Chief Complaint     [🤖]  │││
│         │                                 │  │ "Persistent headaches..." │││
│         │                                 │  └────────────────────────────┘││
│         ▼                                 │                                ││
│  ┌───────────────────┐                    │  ┌────────────────────────────┐││
│  │  State Manager    │                    │  │ Symptoms           [🤖]   │││
│  │  ─────────────────│                    │  │ • Headache (6/10, 2 weeks)│││
│  │  • AI Suggested   │───────────────────▶│  │ • Fatigue (moderate)      │││
│  │  • Human Edited   │                    │  └────────────────────────────┘││
│  │  • Display Mode   │                    │                                ││
│  └───────────────────┘                    │  ┌────────────────────────────┐││
│                                           │  │ Prescriptions      [🤖]   │││
│                                           │  │ • Ibuprofen 400mg [✓][✗] │││
│                                           │  └────────────────────────────┘││
│                                           └────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## State Management

### Medical Record State Interface

```typescript
interface MedicalRecordState {
  // Transcription state
  transcription: {
    fullText: string;
    segments: TranscriptionSegment[];
    status: 'idle' | 'recording' | 'transcribing' | 'completed' | 'error';
  };

  // Extraction state
  extraction: {
    status: 'idle' | 'extracting' | 'completed' | 'error';
    lastExtractedAt: Date | null;
  };

  // Field states
  chiefComplaint: FieldState<string>;
  historyOfPresentIllness: FieldState<string>;
  symptoms: ArrayFieldState<SymptomData>;
  diagnosis: FieldState<DiagnosisData>;
  prescriptions: ArrayFieldState<PrescriptionData>;
  vitalSigns: FieldState<VitalSignsData>;
  treatmentPlan: FieldState<string>;
  followUp: FieldState<string>;
  allergies: string[];
  currentMedications: string[];

  // Form state
  formStatus: 'idle' | 'editing' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
  lastSavedAt: Date | null;
}

interface FieldState<T> {
  aiSuggested: T | null;          // Original AI suggestion
  humanEdited: T | null;          // User's edited version
  displayMode: 'ai' | 'edited' | 'empty';
  confidence: number;              // AI confidence (0-1)
  sourceText: string | null;       // Source from transcript
  isAccepted: boolean;             // User accepted AI suggestion
  isRejected: boolean;             // User rejected AI suggestion
}

interface ArrayFieldState<T> {
  aiSuggested: (T & { id: string; confidence: number; sourceText?: string })[];
  humanEdited: (T & { id: string; isFromAI: boolean })[];
  displayMode: 'ai' | 'merged' | 'manual';
}

// Field data types
interface SymptomData {
  name: string;
  severity?: 'mild' | 'moderate' | 'severe';
  severityScore?: number;
  duration?: string;
  onset?: string;
  bodySite?: string;
  notes?: string;
}

interface DiagnosisData {
  description: string;
  icdCode?: string;
  type?: 'primary' | 'secondary' | 'differential';
  certainty?: 'confirmed' | 'suspected' | 'ruled_out';
  notes?: string;
}

interface PrescriptionData {
  medicationName: string;
  genericName?: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: 'oral' | 'topical' | 'injection' | 'other';
  instructions: string;
  refills?: number;
}

interface VitalSignsData {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  temperatureUnit?: 'C' | 'F';
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  height?: number;
  heightUnit?: 'cm' | 'in';
  oxygenSaturation?: number;
  respiratoryRate?: number;
}
```

### Initial State

```typescript
const createInitialFieldState = <T>(): FieldState<T> => ({
  aiSuggested: null,
  humanEdited: null,
  displayMode: 'empty',
  confidence: 0,
  sourceText: null,
  isAccepted: false,
  isRejected: false,
});

const createInitialArrayFieldState = <T>(): ArrayFieldState<T> => ({
  aiSuggested: [],
  humanEdited: [],
  displayMode: 'manual',
});

const createInitialState = (): MedicalRecordState => ({
  transcription: {
    fullText: '',
    segments: [],
    status: 'idle',
  },
  extraction: {
    status: 'idle',
    lastExtractedAt: null,
  },
  chiefComplaint: createInitialFieldState<string>(),
  historyOfPresentIllness: createInitialFieldState<string>(),
  symptoms: createInitialArrayFieldState<SymptomData>(),
  diagnosis: createInitialFieldState<DiagnosisData>(),
  prescriptions: createInitialArrayFieldState<PrescriptionData>(),
  vitalSigns: createInitialFieldState<VitalSignsData>(),
  treatmentPlan: createInitialFieldState<string>(),
  followUp: createInitialFieldState<string>(),
  allergies: [],
  currentMedications: [],
  formStatus: 'idle',
  isDirty: false,
  lastSavedAt: null,
});
```

---

## State Actions

### Action Types

```typescript
type MedicalRecordAction =
  // Transcription actions
  | { type: 'SET_TRANSCRIPTION'; payload: { text: string; segments: TranscriptionSegment[] } }
  | { type: 'SET_TRANSCRIPTION_STATUS'; payload: MedicalRecordState['transcription']['status'] }

  // Extraction actions
  | { type: 'SET_EXTRACTION_STATUS'; payload: MedicalRecordState['extraction']['status'] }
  | { type: 'APPLY_EXTRACTION'; payload: ExtractedFields }
  | { type: 'CLEAR_ALL_AI_SUGGESTIONS' }

  // Field actions
  | { type: 'UPDATE_FIELD'; payload: { field: keyof MedicalRecordState; value: unknown } }
  | { type: 'ACCEPT_AI_SUGGESTION'; payload: { field: string } }
  | { type: 'REJECT_AI_SUGGESTION'; payload: { field: string } }
  | { type: 'EDIT_FIELD'; payload: { field: string; value: unknown } }

  // Array field actions
  | { type: 'ADD_SYMPTOM'; payload: SymptomData & { isFromAI: boolean } }
  | { type: 'UPDATE_SYMPTOM'; payload: { id: string; data: Partial<SymptomData> } }
  | { type: 'REMOVE_SYMPTOM'; payload: { id: string } }
  | { type: 'ACCEPT_SYMPTOM'; payload: { id: string } }
  | { type: 'REJECT_SYMPTOM'; payload: { id: string } }

  | { type: 'ADD_PRESCRIPTION'; payload: PrescriptionData & { isFromAI: boolean } }
  | { type: 'UPDATE_PRESCRIPTION'; payload: { id: string; data: Partial<PrescriptionData> } }
  | { type: 'REMOVE_PRESCRIPTION'; payload: { id: string } }
  | { type: 'ACCEPT_PRESCRIPTION'; payload: { id: string } }
  | { type: 'REJECT_PRESCRIPTION'; payload: { id: string } }

  // Form actions
  | { type: 'SET_FORM_STATUS'; payload: MedicalRecordState['formStatus'] }
  | { type: 'MARK_SAVED' }
  | { type: 'RESET_FORM' };
```

### Reducer Implementation

```typescript
function medicalRecordReducer(
  state: MedicalRecordState,
  action: MedicalRecordAction
): MedicalRecordState {
  switch (action.type) {
    case 'SET_TRANSCRIPTION':
      return {
        ...state,
        transcription: {
          ...state.transcription,
          fullText: action.payload.text,
          segments: action.payload.segments,
          status: 'completed',
        },
      };

    case 'APPLY_EXTRACTION':
      return applyExtraction(state, action.payload);

    case 'CLEAR_ALL_AI_SUGGESTIONS':
      return clearAllAISuggestions(state);

    case 'ACCEPT_AI_SUGGESTION':
      return acceptAISuggestion(state, action.payload.field);

    case 'REJECT_AI_SUGGESTION':
      return rejectAISuggestion(state, action.payload.field);

    case 'EDIT_FIELD':
      return editField(state, action.payload.field, action.payload.value);

    case 'ACCEPT_SYMPTOM':
      return acceptArrayItem(state, 'symptoms', action.payload.id);

    case 'REJECT_SYMPTOM':
      return rejectArrayItem(state, 'symptoms', action.payload.id);

    case 'ADD_PRESCRIPTION':
      return addArrayItem(state, 'prescriptions', action.payload);

    case 'MARK_SAVED':
      return {
        ...state,
        formStatus: 'saved',
        isDirty: false,
        lastSavedAt: new Date(),
      };

    default:
      return state;
  }
}

function applyExtraction(
  state: MedicalRecordState,
  extraction: ExtractedFields
): MedicalRecordState {
  const newState = { ...state };

  // Apply chief complaint
  if (extraction.chiefComplaint) {
    newState.chiefComplaint = {
      aiSuggested: extraction.chiefComplaint.value,
      humanEdited: null,
      displayMode: 'ai',
      confidence: extraction.chiefComplaint.confidence,
      sourceText: extraction.chiefComplaint.sourceText || null,
      isAccepted: false,
      isRejected: false,
    };
  }

  // Apply symptoms
  if (extraction.symptoms && extraction.symptoms.length > 0) {
    newState.symptoms = {
      aiSuggested: extraction.symptoms.map((s, i) => ({
        id: `ai-symptom-${i}`,
        ...s.value,
        confidence: s.confidence,
        sourceText: s.sourceText,
      })),
      humanEdited: [],
      displayMode: 'ai',
    };
  }

  // Apply diagnosis
  if (extraction.diagnosis) {
    newState.diagnosis = {
      aiSuggested: extraction.diagnosis.value,
      humanEdited: null,
      displayMode: 'ai',
      confidence: extraction.diagnosis.confidence,
      sourceText: extraction.diagnosis.sourceText || null,
      isAccepted: false,
      isRejected: false,
    };
  }

  // Apply prescriptions
  if (extraction.prescriptions && extraction.prescriptions.length > 0) {
    newState.prescriptions = {
      aiSuggested: extraction.prescriptions.map((p, i) => ({
        id: `ai-prescription-${i}`,
        ...p.value,
        confidence: p.confidence,
        sourceText: p.sourceText,
      })),
      humanEdited: [],
      displayMode: 'ai',
    };
  }

  // Apply other fields...
  newState.extraction = {
    status: 'completed',
    lastExtractedAt: new Date(),
  };

  newState.isDirty = true;

  return newState;
}

function acceptAISuggestion(
  state: MedicalRecordState,
  field: string
): MedicalRecordState {
  const fieldState = state[field as keyof MedicalRecordState] as FieldState<unknown>;

  if (!fieldState || !('aiSuggested' in fieldState)) {
    return state;
  }

  return {
    ...state,
    [field]: {
      ...fieldState,
      humanEdited: fieldState.aiSuggested,
      displayMode: 'edited',
      isAccepted: true,
      isRejected: false,
    },
    isDirty: true,
  };
}

function rejectAISuggestion(
  state: MedicalRecordState,
  field: string
): MedicalRecordState {
  const fieldState = state[field as keyof MedicalRecordState] as FieldState<unknown>;

  if (!fieldState || !('aiSuggested' in fieldState)) {
    return state;
  }

  return {
    ...state,
    [field]: {
      ...fieldState,
      displayMode: 'empty',
      isAccepted: false,
      isRejected: true,
    },
    isDirty: true,
  };
}

function clearAllAISuggestions(state: MedicalRecordState): MedicalRecordState {
  return {
    ...state,
    chiefComplaint: createInitialFieldState<string>(),
    historyOfPresentIllness: createInitialFieldState<string>(),
    symptoms: createInitialArrayFieldState<SymptomData>(),
    diagnosis: createInitialFieldState<DiagnosisData>(),
    prescriptions: createInitialArrayFieldState<PrescriptionData>(),
    vitalSigns: createInitialFieldState<VitalSignsData>(),
    treatmentPlan: createInitialFieldState<string>(),
    followUp: createInitialFieldState<string>(),
    isDirty: true,
  };
}
```

---

## React Context Provider

```typescript
interface MedicalRecordContextValue {
  state: MedicalRecordState;
  dispatch: React.Dispatch<MedicalRecordAction>;

  // Derived state
  hasAISuggestions: boolean;
  pendingAISuggestions: number;
  acceptedSuggestions: number;

  // Actions
  applyExtraction: (extraction: ExtractedFields) => void;
  acceptAll: () => void;
  clearAllAI: () => void;
  getFieldValue: <T>(field: string) => T | null;
  getFieldDisplayValue: <T>(field: string) => T | null;
  isFieldFromAI: (field: string) => boolean;
}

const MedicalRecordContext = createContext<MedicalRecordContextValue | null>(null);

export function MedicalRecordProvider({
  children,
  appointmentId,
}: {
  children: React.ReactNode;
  appointmentId: string;
}) {
  const [state, dispatch] = useReducer(medicalRecordReducer, createInitialState());

  // Calculate derived state
  const hasAISuggestions = useMemo(() => {
    return (
      state.chiefComplaint.displayMode === 'ai' ||
      state.symptoms.displayMode === 'ai' ||
      state.diagnosis.displayMode === 'ai' ||
      state.prescriptions.displayMode === 'ai'
    );
  }, [state]);

  const pendingAISuggestions = useMemo(() => {
    let count = 0;

    if (state.chiefComplaint.displayMode === 'ai' && !state.chiefComplaint.isAccepted) count++;
    if (state.diagnosis.displayMode === 'ai' && !state.diagnosis.isAccepted) count++;

    count += state.symptoms.aiSuggested.filter(
      s => !state.symptoms.humanEdited.some(h => h.id === s.id)
    ).length;

    count += state.prescriptions.aiSuggested.filter(
      p => !state.prescriptions.humanEdited.some(h => h.id === p.id)
    ).length;

    return count;
  }, [state]);

  // Actions
  const applyExtraction = useCallback((extraction: ExtractedFields) => {
    dispatch({ type: 'APPLY_EXTRACTION', payload: extraction });
  }, []);

  const acceptAll = useCallback(() => {
    // Accept all AI suggestions
    if (state.chiefComplaint.displayMode === 'ai') {
      dispatch({ type: 'ACCEPT_AI_SUGGESTION', payload: { field: 'chiefComplaint' } });
    }
    if (state.diagnosis.displayMode === 'ai') {
      dispatch({ type: 'ACCEPT_AI_SUGGESTION', payload: { field: 'diagnosis' } });
    }

    state.symptoms.aiSuggested.forEach(s => {
      dispatch({ type: 'ACCEPT_SYMPTOM', payload: { id: s.id } });
    });

    state.prescriptions.aiSuggested.forEach(p => {
      dispatch({ type: 'ACCEPT_PRESCRIPTION', payload: { id: p.id } });
    });
  }, [state]);

  const clearAllAI = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_AI_SUGGESTIONS' });
  }, []);

  const getFieldDisplayValue = useCallback(<T,>(field: string): T | null => {
    const fieldState = state[field as keyof MedicalRecordState] as FieldState<T>;

    if (!fieldState || !('displayMode' in fieldState)) return null;

    switch (fieldState.displayMode) {
      case 'ai':
        return fieldState.aiSuggested;
      case 'edited':
        return fieldState.humanEdited;
      default:
        return null;
    }
  }, [state]);

  const isFieldFromAI = useCallback((field: string): boolean => {
    const fieldState = state[field as keyof MedicalRecordState] as FieldState<unknown>;
    return fieldState?.displayMode === 'ai' && !fieldState?.isAccepted;
  }, [state]);

  const contextValue: MedicalRecordContextValue = {
    state,
    dispatch,
    hasAISuggestions,
    pendingAISuggestions,
    acceptedSuggestions: 0, // Calculate as needed
    applyExtraction,
    acceptAll,
    clearAllAI,
    getFieldValue: getFieldDisplayValue,
    getFieldDisplayValue,
    isFieldFromAI,
  };

  return (
    <MedicalRecordContext.Provider value={contextValue}>
      {children}
    </MedicalRecordContext.Provider>
  );
}

export function useMedicalRecord() {
  const context = useContext(MedicalRecordContext);
  if (!context) {
    throw new Error('useMedicalRecord must be used within MedicalRecordProvider');
  }
  return context;
}
```

---

## UI Update Strategy

### Visual Indicators

| State | Visual Indicator | Description |
|-------|-----------------|-------------|
| **AI Suggested** | 🤖 badge, blue border | Field populated by AI, pending review |
| **Accepted** | ✓ icon, green border | AI suggestion accepted by user |
| **Rejected** | ✗ icon, no content | AI suggestion rejected |
| **Edited** | ✏️ icon, purple border | User modified AI suggestion |
| **Manual** | No badge | User entered manually |

### Field Component Implementation

```typescript
interface AIFieldProps {
  label: string;
  field: string;
  fieldState: FieldState<string>;
  placeholder?: string;
  multiline?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onChange: (value: string) => void;
}

function AIField({
  label,
  field,
  fieldState,
  placeholder,
  multiline = false,
  onAccept,
  onReject,
  onChange,
}: AIFieldProps) {
  const displayValue = fieldState.displayMode === 'ai'
    ? fieldState.aiSuggested
    : fieldState.humanEdited;

  const isFromAI = fieldState.displayMode === 'ai' && !fieldState.isAccepted;
  const confidence = fieldState.confidence;

  const confidenceColor = useMemo(() => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.5) return 'yellow';
    return 'gray';
  }, [confidence]);

  return (
    <div className={cn(
      'field-container',
      isFromAI && 'ai-suggested',
      fieldState.isAccepted && 'accepted',
      fieldState.displayMode === 'edited' && 'user-edited',
    )}>
      <div className="field-header">
        <label>{label}</label>
        {isFromAI && (
          <div className="ai-badge">
            <span className="ai-icon">🤖</span>
            <span className="ai-label">AI</span>
            <span
              className="confidence-indicator"
              style={{ backgroundColor: confidenceColor }}
              title={`${Math.round(confidence * 100)}% confident`}
            />
          </div>
        )}
        {fieldState.isAccepted && (
          <span className="accepted-badge">✓ Accepted</span>
        )}
      </div>

      <div className="field-content">
        {multiline ? (
          <textarea
            value={displayValue || ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(isFromAI && 'ai-highlighted')}
          />
        ) : (
          <input
            type="text"
            value={displayValue || ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(isFromAI && 'ai-highlighted')}
          />
        )}
      </div>

      {isFromAI && (
        <div className="field-actions">
          <button
            onClick={onAccept}
            className="accept-btn"
            title="Accept AI suggestion"
          >
            ✓ Accept
          </button>
          <button
            onClick={onReject}
            className="reject-btn"
            title="Reject AI suggestion"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {fieldState.sourceText && isFromAI && (
        <div className="source-text">
          <span className="source-label">Source:</span>
          <q>{fieldState.sourceText}</q>
        </div>
      )}
    </div>
  );
}
```

### Styles

```css
/* AI Field Styles */
.field-container {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.field-container.ai-suggested {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.field-container.accepted {
  border-color: #10b981;
  background-color: rgba(16, 185, 129, 0.05);
}

.field-container.user-edited {
  border-color: #8b5cf6;
  background-color: rgba(139, 92, 246, 0.05);
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #3b82f6;
  color: white;
  border-radius: 12px;
  font-size: 12px;
}

.confidence-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.field-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.accept-btn {
  padding: 4px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reject-btn {
  padding: 4px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.source-text {
  margin-top: 8px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 13px;
  color: #64748b;
}

/* Highlight animation for new AI content */
@keyframes ai-highlight {
  0% { background-color: rgba(59, 130, 246, 0.3); }
  100% { background-color: rgba(59, 130, 246, 0.05); }
}

.ai-highlighted {
  animation: ai-highlight 1s ease-out;
}
```

---

## Real-time Update Flow

### Update Flow Diagram

```
1. New transcription chunk arrives
   │
   ▼
2. Extraction service processes chunk
   │
   ├──────────────────────────────────┐
   │                                  │
   ▼                                  ▼
3a. New fields extracted          3b. Existing fields updated
   │                                  │
   ▼                                  ▼
4. State reducer merges with existing state
   │
   ▼
5. React re-renders affected components
   │
   ▼
6. Visual feedback (highlight animation)
   │
   ▼
7. User can accept/reject at any time
```

### Real-time Update Hook

```typescript
interface UseRealTimeAutoFillOptions {
  appointmentId: string;
  onExtractionComplete?: (fields: ExtractedFields) => void;
  onError?: (error: string) => void;
}

function useRealTimeAutoFill({
  appointmentId,
  onExtractionComplete,
  onError,
}: UseRealTimeAutoFillOptions) {
  const { state, dispatch, applyExtraction } = useMedicalRecord();
  const [isExtracting, setIsExtracting] = useState(false);

  // Trigger extraction when transcription completes
  useEffect(() => {
    if (
      state.transcription.status === 'completed' &&
      state.transcription.fullText &&
      state.extraction.status === 'idle'
    ) {
      performExtraction();
    }
  }, [state.transcription.status]);

  const performExtraction = async () => {
    setIsExtracting(true);
    dispatch({ type: 'SET_EXTRACTION_STATUS', payload: 'extracting' });

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'en',
          strictMode: false,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Extraction failed');
      }

      applyExtraction(result.data.fields);
      onExtractionComplete?.(result.data.fields);
    } catch (error) {
      dispatch({ type: 'SET_EXTRACTION_STATUS', payload: 'error' });
      onError?.(error instanceof Error ? error.message : 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const retryExtraction = async () => {
    dispatch({ type: 'SET_EXTRACTION_STATUS', payload: 'idle' });
    await performExtraction();
  };

  return {
    isExtracting,
    extractionStatus: state.extraction.status,
    retryExtraction,
  };
}
```

---

## Accept/Reject Interactions

### Accept All Action

```typescript
function AcceptAllButton() {
  const { pendingAISuggestions, acceptAll, hasAISuggestions } = useMedicalRecord();

  if (!hasAISuggestions || pendingAISuggestions === 0) {
    return null;
  }

  return (
    <button
      onClick={acceptAll}
      className="accept-all-btn"
    >
      ✓ Accept All ({pendingAISuggestions})
    </button>
  );
}
```

### Clear All Action

```typescript
function ClearAllAIButton() {
  const { hasAISuggestions, clearAllAI } = useMedicalRecord();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!hasAISuggestions) {
    return null;
  }

  const handleClear = () => {
    clearAllAI();
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="clear-all-btn"
      >
        Clear All AI
      </button>

      {showConfirm && (
        <ConfirmDialog
          title="Clear AI Suggestions"
          message="This will remove all AI-extracted information. You can still enter information manually."
          onConfirm={handleClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

### Individual Item Accept/Reject

```typescript
interface SymptomCardProps {
  symptom: SymptomData & { id: string; confidence: number; sourceText?: string };
  isFromAI: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (data: Partial<SymptomData>) => void;
}

function SymptomCard({
  symptom,
  isFromAI,
  onAccept,
  onReject,
  onEdit,
}: SymptomCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={cn('symptom-card', isFromAI && 'ai-suggested')}>
      <div className="symptom-header">
        <h4>{symptom.name}</h4>
        {isFromAI && <span className="ai-badge">🤖 AI</span>}
      </div>

      <div className="symptom-details">
        {symptom.severity && (
          <span className="detail">Severity: {symptom.severity}</span>
        )}
        {symptom.severityScore && (
          <span className="detail">Pain: {symptom.severityScore}/10</span>
        )}
        {symptom.duration && (
          <span className="detail">Duration: {symptom.duration}</span>
        )}
        {symptom.bodySite && (
          <span className="detail">Location: {symptom.bodySite}</span>
        )}
      </div>

      {isFromAI && (
        <div className="card-actions">
          <button onClick={onAccept} className="accept-btn">✓ Accept</button>
          <button onClick={onReject} className="reject-btn">✗ Remove</button>
          <button onClick={() => setIsEditing(true)} className="edit-btn">✏️ Edit</button>
        </div>
      )}

      {!isFromAI && (
        <div className="card-actions">
          <button onClick={() => setIsEditing(true)} className="edit-btn">✏️ Edit</button>
          <button onClick={onReject} className="delete-btn">🗑️ Delete</button>
        </div>
      )}

      {isEditing && (
        <SymptomEditModal
          symptom={symptom}
          onSave={(data) => {
            onEdit(data);
            setIsEditing(false);
          }}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
```

---

## Edit History

### Tracking Changes

```typescript
interface FieldChange {
  field: string;
  timestamp: Date;
  previousValue: unknown;
  newValue: unknown;
  changeType: 'ai_applied' | 'ai_accepted' | 'ai_rejected' | 'user_edit';
}

interface EditHistory {
  changes: FieldChange[];
  addChange: (change: FieldChange) => void;
  getFieldHistory: (field: string) => FieldChange[];
  canUndo: boolean;
  undo: () => void;
}

function useEditHistory(): EditHistory {
  const [changes, setChanges] = useState<FieldChange[]>([]);

  const addChange = useCallback((change: FieldChange) => {
    setChanges(prev => [...prev, change]);
  }, []);

  const getFieldHistory = useCallback((field: string) => {
    return changes.filter(c => c.field === field);
  }, [changes]);

  const canUndo = changes.length > 0;

  const undo = useCallback(() => {
    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1];
    // Apply undo logic based on change type

    setChanges(prev => prev.slice(0, -1));
  }, [changes]);

  return {
    changes,
    addChange,
    getFieldHistory,
    canUndo,
    undo,
  };
}
```

---

## Auto-Save Integration

### Auto-Save Hook

```typescript
interface UseAutoSaveOptions {
  appointmentId: string;
  interval?: number;
  enabled?: boolean;
}

function useAutoSave({
  appointmentId,
  interval = 30000, // 30 seconds
  enabled = true,
}: UseAutoSaveOptions) {
  const { state } = useMedicalRecord();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveRecord = useCallback(async () => {
    if (!state.isDirty) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = buildSavePayload(state);

      const response = await fetch(`/api/appointments/${appointmentId}/record`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setLastSaved(new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [state, appointmentId]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !state.isDirty) return;

    const timer = setInterval(saveRecord, interval);
    return () => clearInterval(timer);
  }, [enabled, state.isDirty, interval, saveRecord]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (state.isDirty) {
        saveRecord();
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    saveError,
    saveRecord,
  };
}

function buildSavePayload(state: MedicalRecordState): Record<string, unknown> {
  return {
    chiefComplaint: state.chiefComplaint.humanEdited || state.chiefComplaint.aiSuggested,
    historyOfPresentIllness: state.historyOfPresentIllness.humanEdited || state.historyOfPresentIllness.aiSuggested,
    symptoms: [
      ...state.symptoms.humanEdited,
      ...state.symptoms.aiSuggested.filter(
        s => !state.symptoms.humanEdited.some(h => h.id === s.id)
      ),
    ],
    diagnosis: state.diagnosis.humanEdited || state.diagnosis.aiSuggested,
    prescriptions: [
      ...state.prescriptions.humanEdited,
      ...state.prescriptions.aiSuggested.filter(
        p => !state.prescriptions.humanEdited.some(h => h.id === p.id)
      ),
    ],
    vitalSigns: state.vitalSigns.humanEdited || state.vitalSigns.aiSuggested,
    treatmentPlan: state.treatmentPlan.humanEdited || state.treatmentPlan.aiSuggested,
    followUp: state.followUp.humanEdited || state.followUp.aiSuggested,
    allergies: state.allergies,
    currentMedications: state.currentMedications,
    transcriptId: state.transcription.fullText ? 'pending' : null,
    isDraft: true,
  };
}
```

---

## References

- [Field Extraction Specification](./field-extraction.md)
- [US-007: AI Auto-Fill Medical Record](../stories/cards/US-007-ai-auto-fill.md)
- [React Context Documentation](https://react.dev/reference/react/useContext)
- [useReducer Hook](https://react.dev/reference/react/useReducer)
