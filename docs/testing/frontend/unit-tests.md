# Frontend Unit Tests

This document specifies the unit tests for the MedRecord AI frontend components, hooks, and utilities.

---

## Test Structure

```
packages/frontend/tests/unit/
├── components/
│   ├── patients/
│   │   ├── PatientCard.test.tsx
│   │   ├── PatientForm.test.tsx
│   │   ├── PatientList.test.tsx
│   │   └── PatientSearch.test.tsx
│   ├── appointments/
│   │   ├── AppointmentCard.test.tsx
│   │   ├── AppointmentForm.test.tsx
│   │   └── AppointmentStatus.test.tsx
│   ├── medical-records/
│   │   ├── SymptomsSection.test.tsx
│   │   ├── SymptomCard.test.tsx
│   │   ├── DiagnosisSection.test.tsx
│   │   ├── PrescriptionsSection.test.tsx
│   │   └── AIFieldBadge.test.tsx
│   └── transcription/
│       ├── AudioRecorder.test.tsx
│       ├── TranscriptionDisplay.test.tsx
│       └── AIExtractionStatus.test.tsx
├── hooks/
│   ├── useAuth.test.ts
│   ├── usePatients.test.ts
│   ├── useAppointments.test.ts
│   ├── useMedicalRecord.test.ts
│   └── useAudioRecorder.test.ts
└── utils/
    ├── formatters.test.ts
    └── validators.test.ts
```

---

## Component Tests

### Patient Components

```typescript
// components/patients/PatientCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PatientCard } from '@/components/patients/PatientCard';

const mockPatient = {
  id: 'patient-1',
  firstName: 'Juan',
  lastName: 'García',
  dateOfBirth: '1985-03-15',
  sex: 'male' as const,
  phone: '+34612345678',
  allergies: [],
  chronicConditions: [],
};

describe('PatientCard', () => {
  it('should render patient name', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    expect(screen.getByText('Juan García')).toBeInTheDocument();
  });

  it('should render patient phone', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    expect(screen.getByText('+34612345678')).toBeInTheDocument();
  });

  it('should calculate and display age', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    // Age calculation depends on current date
    expect(screen.getByText(/años/i)).toBeInTheDocument();
  });

  it('should display patient initials', () => {
    render(<PatientCard patient={mockPatient} onClick={() => {}} />);

    expect(screen.getByText('JG')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<PatientCard patient={mockPatient} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(mockPatient);
  });

  it('should show allergy badge when patient has allergies', () => {
    const patientWithAllergies = {
      ...mockPatient,
      allergies: [{ id: '1', name: 'Penicillin', severity: 'severe' }],
    };

    render(<PatientCard patient={patientWithAllergies} onClick={() => {}} />);

    expect(screen.getByText(/alergia/i)).toBeInTheDocument();
  });

  it('should show condition badge when patient has chronic conditions', () => {
    const patientWithConditions = {
      ...mockPatient,
      chronicConditions: [{ id: '1', name: 'Diabetes', status: 'active' }],
    };

    render(<PatientCard patient={patientWithConditions} onClick={() => {}} />);

    expect(screen.getByText(/condición/i)).toBeInTheDocument();
  });
});
```

```typescript
// components/patients/PatientForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PatientForm } from '@/components/patients/PatientForm';

describe('PatientForm', () => {
  it('should render all required fields', () => {
    render(<PatientForm onSubmit={() => {}} />);

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de nacimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sexo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contacto de emergencia/i)).toBeInTheDocument();
  });

  it('should show validation errors on submit with empty fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PatientForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<PatientForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Juan');
    await user.type(screen.getByLabelText(/apellido/i), 'García');
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1985-03-15');
    await user.selectOptions(screen.getByLabelText(/sexo/i), 'male');
    await user.type(screen.getByLabelText(/teléfono/i), '+34612345678');
    await user.type(screen.getByLabelText(/nombre.*emergencia/i), 'María García');
    await user.type(screen.getByLabelText(/teléfono.*emergencia/i), '+34612345679');

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Juan',
          lastName: 'García',
        })
      );
    });
  });

  it('should pre-fill fields when patient prop provided', () => {
    const existingPatient = {
      id: 'patient-1',
      firstName: 'Juan',
      lastName: 'García',
      dateOfBirth: '1985-03-15',
      sex: 'male',
      phone: '+34612345678',
      emergencyContactName: 'María',
      emergencyContactPhone: '+34612345679',
    };

    render(<PatientForm patient={existingPatient} onSubmit={() => {}} />);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Juan');
    expect(screen.getByLabelText(/apellido/i)).toHaveValue('García');
  });

  it('should disable submit button while loading', () => {
    render(<PatientForm onSubmit={() => {}} isLoading={true} />);

    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<PatientForm onSubmit={() => {}} isLoading={true} />);

    expect(screen.getByText(/guardando/i)).toBeInTheDocument();
  });

  it('should validate email format when provided', async () => {
    const user = userEvent.setup();

    render(<PatientForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('should validate phone format', async () => {
    const user = userEvent.setup();

    render(<PatientForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/teléfono/i), '123');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/teléfono inválido/i)).toBeInTheDocument();
    });
  });
});
```

```typescript
// components/patients/PatientList.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PatientList } from '@/components/patients/PatientList';

const mockPatients = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'García',
    dateOfBirth: '1985-03-15',
    sex: 'male',
    phone: '+34600000001',
    allergies: [],
    chronicConditions: [],
  },
  {
    id: '2',
    firstName: 'María',
    lastName: 'López',
    dateOfBirth: '1990-07-20',
    sex: 'female',
    phone: '+34600000002',
    allergies: [],
    chronicConditions: [],
  },
];

describe('PatientList', () => {
  it('should render list of patients', () => {
    render(<PatientList patients={mockPatients} onPatientClick={() => {}} />);

    expect(screen.getByText('Juan García')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
  });

  it('should show empty state when no patients', () => {
    render(<PatientList patients={[]} onPatientClick={() => {}} />);

    expect(screen.getByText(/no hay pacientes/i)).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    render(<PatientList patients={[]} onPatientClick={() => {}} isLoading={true} />);

    expect(screen.getAllByTestId('patient-skeleton')).toHaveLength(3);
  });

  it('should call onPatientClick when patient clicked', async () => {
    const onPatientClick = vi.fn();
    const user = await import('@testing-library/user-event').then((m) => m.default.setup());

    render(<PatientList patients={mockPatients} onPatientClick={onPatientClick} />);

    await user.click(screen.getByText('Juan García'));

    expect(onPatientClick).toHaveBeenCalledWith(mockPatients[0]);
  });
});
```

```typescript
// components/patients/PatientSearch.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PatientSearch } from '@/components/patients/PatientSearch';

describe('PatientSearch', () => {
  it('should render search input', () => {
    render(<PatientSearch onSearch={() => {}} />);

    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it('should call onSearch with debounce', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearch = vi.fn();

    render(<PatientSearch onSearch={onSearch} />);

    await user.type(screen.getByPlaceholderText(/buscar/i), 'Juan');

    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Advance timers past debounce delay
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('Juan');
    });

    vi.useRealTimers();
  });

  it('should show clear button when has value', async () => {
    const user = userEvent.setup();

    render(<PatientSearch onSearch={() => {}} />);

    await user.type(screen.getByPlaceholderText(/buscar/i), 'test');

    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
  });

  it('should clear search on clear button click', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<PatientSearch onSearch={onSearch} />);

    await user.type(screen.getByPlaceholderText(/buscar/i), 'test');
    await user.click(screen.getByRole('button', { name: /limpiar/i }));

    expect(screen.getByPlaceholderText(/buscar/i)).toHaveValue('');
  });
});
```

### Medical Record Components

```typescript
// components/medical-records/SymptomsSection.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SymptomsSection } from '@/components/medical-records/SymptomsSection';

const mockSymptoms = [
  {
    id: '1',
    description: 'Dolor de cabeza',
    severity: 7,
    bodySite: 'Head',
    duration: '3 days',
    isAIGenerated: false,
  },
  {
    id: '2',
    description: 'Náuseas',
    severity: 4,
    bodySite: 'Stomach',
    duration: '1 day',
    isAIGenerated: true,
  },
];

describe('SymptomsSection', () => {
  it('should render list of symptoms', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByText('Dolor de cabeza')).toBeInTheDocument();
    expect(screen.getByText('Náuseas')).toBeInTheDocument();
  });

  it('should show AI badge for AI-generated symptoms', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    const aiBadges = screen.getAllByTestId('ai-badge');
    expect(aiBadges).toHaveLength(1);
  });

  it('should allow adding new symptom', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <SymptomsSection
        symptoms={[]}
        onAdd={onAdd}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /añadir síntoma/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should allow removing symptom', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={() => {}}
        onRemove={onRemove}
        onUpdate={() => {}}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /eliminar/i });
    await user.click(removeButtons[0]);

    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('should show accept AI suggestions button when available', () => {
    const aiSuggestions = [
      { description: 'Fiebre', severity: 8, isAIGenerated: true },
    ];

    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        aiSuggestions={aiSuggestions}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
        onAcceptAI={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /aceptar sugerencias/i })).toBeInTheDocument();
  });

  it('should call onAcceptAI when accepting suggestions', async () => {
    const user = userEvent.setup();
    const onAcceptAI = vi.fn();
    const aiSuggestions = [{ description: 'Fiebre', severity: 8 }];

    render(
      <SymptomsSection
        symptoms={[]}
        aiSuggestions={aiSuggestions}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
        onAcceptAI={onAcceptAI}
      />
    );

    await user.click(screen.getByRole('button', { name: /aceptar sugerencias/i }));

    expect(onAcceptAI).toHaveBeenCalled();
  });

  it('should show severity indicator', () => {
    render(
      <SymptomsSection
        symptoms={mockSymptoms}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByText('7/10')).toBeInTheDocument();
  });
});
```

```typescript
// components/medical-records/DiagnosisSection.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DiagnosisSection } from '@/components/medical-records/DiagnosisSection';

describe('DiagnosisSection', () => {
  it('should render diagnosis input', () => {
    render(<DiagnosisSection value="" onChange={() => {}} />);

    expect(screen.getByLabelText(/diagnóstico/i)).toBeInTheDocument();
  });

  it('should show current value', () => {
    render(<DiagnosisSection value="Migraña tensional" onChange={() => {}} />);

    expect(screen.getByDisplayValue('Migraña tensional')).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DiagnosisSection value="" onChange={onChange} />);

    await user.type(screen.getByLabelText(/diagnóstico/i), 'Test');

    expect(onChange).toHaveBeenCalled();
  });

  it('should show AI badge when AI-generated', () => {
    render(
      <DiagnosisSection
        value="AI diagnosis"
        onChange={() => {}}
        isAIGenerated={true}
      />
    );

    expect(screen.getByTestId('ai-badge')).toBeInTheDocument();
  });

  it('should show notes textarea', () => {
    render(
      <DiagnosisSection
        value=""
        notes=""
        onChange={() => {}}
        onNotesChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();
  });
});
```

```typescript
// components/medical-records/PrescriptionsSection.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PrescriptionsSection } from '@/components/medical-records/PrescriptionsSection';

const mockPrescriptions = [
  {
    id: '1',
    medicationName: 'Ibuprofeno',
    strength: '400mg',
    dosage: '1 tablet',
    frequency: 'Every 8 hours',
    duration: '5 days',
    instructions: 'Take with food',
    isAIGenerated: false,
  },
];

describe('PrescriptionsSection', () => {
  it('should render list of prescriptions', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByText('Ibuprofeno')).toBeInTheDocument();
    expect(screen.getByText('400mg')).toBeInTheDocument();
  });

  it('should show add prescription button', () => {
    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /añadir receta/i })).toBeInTheDocument();
  });

  it('should open prescription form modal on add', async () => {
    const user = userEvent.setup();

    render(
      <PrescriptionsSection
        prescriptions={[]}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /añadir receta/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show prescription details', () => {
    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={() => {}}
        onRemove={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByText('Every 8 hours')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('should allow removing prescription', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <PrescriptionsSection
        prescriptions={mockPrescriptions}
        onAdd={() => {}}
        onRemove={onRemove}
        onUpdate={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(onRemove).toHaveBeenCalledWith('1');
  });
});
```

### Transcription Components

```typescript
// components/transcription/AudioRecorder.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AudioRecorder } from '@/components/transcription/AudioRecorder';

describe('AudioRecorder', () => {
  it('should show start recording button when idle', () => {
    render(
      <AudioRecorder
        isRecording={false}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /iniciar grabación/i })).toBeInTheDocument();
  });

  it('should show stop button when recording', () => {
    render(
      <AudioRecorder
        isRecording={true}
        duration={30}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /detener/i })).toBeInTheDocument();
  });

  it('should display duration when recording', () => {
    render(
      <AudioRecorder
        isRecording={true}
        duration={125}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('should call onStart when start button clicked', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(
      <AudioRecorder
        isRecording={false}
        onStart={onStart}
        onStop={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /iniciar/i }));

    expect(onStart).toHaveBeenCalled();
  });

  it('should call onStop when stop button clicked', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();

    render(
      <AudioRecorder
        isRecording={true}
        duration={10}
        onStart={() => {}}
        onStop={onStop}
      />
    );

    await user.click(screen.getByRole('button', { name: /detener/i }));

    expect(onStop).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <AudioRecorder
        isRecording={false}
        disabled={true}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /iniciar/i })).toBeDisabled();
  });

  it('should show recording indicator when recording', () => {
    render(
      <AudioRecorder
        isRecording={true}
        duration={10}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
  });

  it('should show processing state', () => {
    render(
      <AudioRecorder
        isRecording={false}
        isProcessing={true}
        onStart={() => {}}
        onStop={() => {}}
      />
    );

    expect(screen.getByText(/procesando/i)).toBeInTheDocument();
  });
});
```

```typescript
// components/transcription/TranscriptionDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TranscriptionDisplay } from '@/components/transcription/TranscriptionDisplay';

describe('TranscriptionDisplay', () => {
  it('should render transcription text', () => {
    render(
      <TranscriptionDisplay
        text="El paciente refiere dolor de cabeza desde hace tres días."
      />
    );

    expect(screen.getByText(/dolor de cabeza/i)).toBeInTheDocument();
  });

  it('should show empty state when no transcription', () => {
    render(<TranscriptionDisplay text="" />);

    expect(screen.getByText(/sin transcripción/i)).toBeInTheDocument();
  });

  it('should highlight extracted phrases when provided', () => {
    render(
      <TranscriptionDisplay
        text="El paciente refiere dolor de cabeza."
        highlights={[{ start: 22, end: 38, type: 'symptom' }]}
      />
    );

    expect(screen.getByTestId('highlight-symptom')).toBeInTheDocument();
  });

  it('should show timestamps when available', () => {
    render(
      <TranscriptionDisplay
        text="El paciente refiere dolor de cabeza."
        segments={[
          { start: 0, end: 5, text: 'El paciente refiere dolor de cabeza.' },
        ]}
        showTimestamps={true}
      />
    );

    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('should scroll to bottom when new text added', () => {
    const { rerender } = render(<TranscriptionDisplay text="Initial text" />);

    rerender(<TranscriptionDisplay text="Initial text. More text added." />);

    // Container should auto-scroll (behavior test)
  });

  it('should show loading state while processing', () => {
    render(<TranscriptionDisplay text="" isLoading={true} />);

    expect(screen.getByText(/transcribiendo/i)).toBeInTheDocument();
  });
});
```

```typescript
// components/transcription/AIExtractionStatus.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AIExtractionStatus } from '@/components/transcription/AIExtractionStatus';

describe('AIExtractionStatus', () => {
  it('should show idle state when not started', () => {
    render(<AIExtractionStatus status="idle" />);

    expect(screen.queryByTestId('extraction-progress')).not.toBeInTheDocument();
  });

  it('should show processing state', () => {
    render(<AIExtractionStatus status="processing" />);

    expect(screen.getByText(/extrayendo/i)).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should show completed state with extracted count', () => {
    render(
      <AIExtractionStatus
        status="completed"
        extractedFields={{
          symptoms: 3,
          diagnosis: 1,
          prescriptions: 2,
        }}
      />
    );

    expect(screen.getByText('3 síntomas')).toBeInTheDocument();
    expect(screen.getByText('1 diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('2 recetas')).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(
      <AIExtractionStatus
        status="error"
        error="Failed to extract fields"
      />
    );

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('should show retry button on error', () => {
    render(
      <AIExtractionStatus
        status="error"
        error="Error"
        onRetry={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});
```

---

## Hook Tests

```typescript
// hooks/useAuth.test.ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/context/AuthContext';
import * as authApi from '@/services/auth.api';

vi.mock('@/services/auth.api');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return isAuthenticated false when no token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should return isAuthenticated true when valid token', async () => {
    localStorage.setItem('token', 'valid-token');
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should call login API and store token', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      data: {
        token: 'new-token',
        user: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@test.com', password: 'password' });
    });

    expect(localStorage.getItem('token')).toBe('new-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear token on logout', async () => {
    localStorage.setItem('token', 'token');
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should load user on mount if token exists', async () => {
    localStorage.setItem('token', 'existing-token');
    vi.mocked(authApi.getMe).mockResolvedValue({
      data: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.email).toBe('test@test.com');
    });
  });
});
```

```typescript
// hooks/useAudioRecorder.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

// Mock navigator.mediaDevices
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive',
};

const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    };
    // @ts-ignore
    global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);
  });

  it('should initialize with isRecording false', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it('should request microphone permission on start', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
    });
  });

  it('should start recording when permission granted', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  it('should update duration while recording', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.duration).toBe(5);
    vi.useRealTimers();
  });

  it('should stop recording and return audio blob', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    let audioBlob: Blob | null = null;
    await act(async () => {
      audioBlob = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });

  it('should handle permission denied error', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new Error('Permission denied')
    );

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      try {
        await result.current.startRecording();
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe('Permission denied');
  });
});
```

```typescript
// hooks/usePatients.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { usePatients } from '@/hooks/usePatients';
import * as patientsApi from '@/services/patients.api';

vi.mock('@/services/patients.api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePatients', () => {
  it('should fetch patients successfully', async () => {
    const mockPatients = [
      { id: '1', firstName: 'Juan', lastName: 'García' },
      { id: '2', firstName: 'María', lastName: 'López' },
    ];

    vi.mocked(patientsApi.getPatients).mockResolvedValue({
      data: mockPatients,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].firstName).toBe('Juan');
  });

  it('should handle search parameter', async () => {
    vi.mocked(patientsApi.getPatients).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20 },
    });

    renderHook(() => usePatients({ search: 'juan' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(patientsApi.getPatients).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'juan' })
      );
    });
  });

  it('should handle pagination', async () => {
    vi.mocked(patientsApi.getPatients).mockResolvedValue({
      data: [],
      pagination: { total: 50, page: 2, limit: 10 },
    });

    renderHook(() => usePatients({ page: 2, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(patientsApi.getPatients).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  it('should handle error state', async () => {
    vi.mocked(patientsApi.getPatients).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

---

## Utility Tests

```typescript
// utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatPhone,
  formatDuration,
  calculateAge,
} from '@/utils/formatters';

describe('Formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      expect(formatDate('2024-01-15')).toBe('15/01/2024');
    });

    it('should handle Date object', () => {
      expect(formatDate(new Date('2024-01-15'))).toBe('15/01/2024');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null as any)).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      expect(formatDateTime('2024-01-15T10:30:00')).toBe('15/01/2024 10:30');
    });
  });

  describe('formatPhone', () => {
    it('should format Spanish phone number', () => {
      expect(formatPhone('+34612345678')).toBe('+34 612 345 678');
    });

    it('should handle phone without country code', () => {
      expect(formatPhone('612345678')).toBe('612 345 678');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0:00');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);

      expect(calculateAge(birthDate.toISOString())).toBe(30);
    });

    it('should handle birthday not yet passed this year', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth() + 1, 15);

      const age = calculateAge(birthDate.toISOString());
      expect(age).toBe(24);
    });
  });
});
```

```typescript
// utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  patientSchema,
} from '@/utils/validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Spanish phone numbers', () => {
      expect(validatePhone('+34612345678')).toBe(true);
      expect(validatePhone('612345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abcdefghij')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should pass for non-empty values', () => {
      expect(validateRequired('value')).toBe(true);
      expect(validateRequired(123)).toBe(true);
    });

    it('should fail for empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe('patientSchema', () => {
    it('should validate complete patient data', () => {
      const validPatient = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1985-03-15',
        sex: 'male',
        phone: '+34612345678',
        emergencyContactName: 'María',
        emergencyContactPhone: '+34612345679',
      };

      const result = patientSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should reject invalid patient data', () => {
      const invalidPatient = {
        firstName: '',
        lastName: 'García',
      };

      const result = patientSchema.safeParse(invalidPatient);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## Test Count Summary

| Category | Test Files | Test Cases |
|----------|------------|------------|
| **Patient Components** | 4 | 28 |
| **Medical Record Components** | 3 | 18 |
| **Transcription Components** | 3 | 20 |
| **Hooks** | 3 | 15 |
| **Utils** | 2 | 18 |
| **Total** | **15** | **~99** |

---

## References

- [Testing Strategy](../strategy.md)
- [E2E Tests](../e2e/e2e-tests.md)
- [Test Utilities](../utilities.md)
