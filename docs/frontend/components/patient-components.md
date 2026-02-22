# Patient Components Specification

## Overview

This document specifies the components used for patient management, including patient lists, cards, forms, and detail views.

## Component List

| Component | Description | Used In |
|-----------|-------------|---------|
| `PatientList` | Grid/list of patient cards | PatientsPage |
| `PatientCard` | Individual patient display | PatientList, Dashboard |
| `PatientForm` | Create/edit patient form | NewPatientPage, PatientDetailPage |
| `PatientSearch` | Search input with debounce | PatientsPage |
| `PatientInfoCard` | Patient info display | PatientDetailPage |
| `PatientSummaryCard` | Compact patient info | NewAppointmentPage |
| `EmergencyContactCard` | Emergency contact display | PatientDetailPage |
| `AllergyList` | Patient allergies | PatientDetailPage |
| `ConditionList` | Chronic conditions | PatientDetailPage |

## PatientList

Container for displaying multiple patient cards in a grid layout.

```typescript
// src/components/patients/PatientList.tsx

interface PatientListProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  isLoading: boolean;
  emptyState?: React.ReactNode;
}

export const PatientList: React.FC<PatientListProps> = ({
  patients,
  onSelect,
  isLoading,
  emptyState,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PatientCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return emptyState || <DefaultEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onClick={() => onSelect(patient)}
        />
      ))}
    </div>
  );
};
```

### Visual Structure

```
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ PatientCard             │ │ PatientCard             │ │ PatientCard             │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ PatientCard             │ │ PatientCard             │ │ PatientCard             │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘

Grid: 1 column mobile, 2 tablet, 3 desktop
Gap: 16px
```

## PatientCard

Individual patient card for list display.

```typescript
// src/components/patients/PatientCard.tsx

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  compact?: boolean;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  onClick,
  compact = false,
}) => {
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Card
      variant="interactive"
      className="p-4"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary-100 text-primary-700">
            {getInitials(patient.firstName, patient.lastName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900 truncate">
            {patient.firstName} {patient.lastName}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-sm text-secondary-500">
            <span>{age} años</span>
            <span>•</span>
            <span>{formatGender(patient.sex)}</span>
          </div>

          {!compact && (
            <>
              <div className="mt-2 flex items-center gap-1 text-sm text-secondary-600">
                <Phone size={14} />
                <span>{formatPhone(patient.phone)}</span>
              </div>

              {patient.email && (
                <div className="mt-1 flex items-center gap-1 text-sm text-secondary-600 truncate">
                  <Mail size={14} />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-secondary-100 text-xs text-secondary-500">
                <div>
                  Última cita: {patient.lastAppointmentAt
                    ? formatRelativeDate(patient.lastAppointmentAt)
                    : 'Ninguna'}
                </div>
                <div>Total citas: {patient.appointmentCount}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
```

### Visual Structure

```
┌─────────────────────────────────────┐
│ ┌────┐  María García López          │
│ │ MG │  45 años • Femenino          │
│ └────┘                              │
│        📱 +52 555 123 4567          │
│        📧 maria@email.com           │
│        ─────────────────────        │
│        Última cita: Hace 2 días     │
│        Total citas: 5               │
└─────────────────────────────────────┘
```

### Skeleton Loading

```typescript
// src/components/patients/PatientCardSkeleton.tsx

export const PatientCardSkeleton: React.FC = () => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-4 w-36 mb-3" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  </Card>
);
```

## PatientSearch

Search input with debounce for patient filtering.

```typescript
// src/components/patients/PatientSearch.tsx

interface PatientSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  value,
  onChange,
  placeholder = 'Buscar por nombre, teléfono o email...',
  autoFocus = false,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebouncedValue(localValue, 300);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400"
      />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
        autoFocus={autoFocus}
      />
      {localValue && (
        <button
          onClick={() => setLocalValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
```

### Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│ 🔍  Buscar por nombre, teléfono o email...         [✕] │
└─────────────────────────────────────────────────────────┘
```

## PatientForm

Form for creating or editing patients.

```typescript
// src/components/patients/PatientForm.tsx

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? mapPatientToFormData(patient) : defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider">
            Información Personal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl>
                    <Input placeholder="Apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Nacimiento *</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      maxDate={new Date()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider">
            Información de Contacto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Textarea placeholder="Dirección completa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Emergency Contact Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider">
            Contacto de Emergencia
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="emergencyContactRelationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relación</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Esposo, Madre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {patient ? 'Guardar Cambios' : 'Registrar Paciente'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

## PatientInfoCard

Displays patient information in detail view.

```typescript
// src/components/patients/PatientInfoCard.tsx

interface PatientInfoCardProps {
  patient: Patient;
  onEdit: () => void;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({
  patient,
  onEdit,
}) => {
  const age = calculateAge(patient.dateOfBirth);

  return (
    <ContentCard
      title="Información del Paciente"
      actions={
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit size={14} className="mr-1" />
          Editar
        </Button>
      }
    >
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem label="Nombre Completo">
          {patient.firstName} {patient.lastName}
        </InfoItem>
        <InfoItem label="Fecha de Nacimiento">
          {formatDate(patient.dateOfBirth)} ({age} años)
        </InfoItem>
        <InfoItem label="Sexo">
          {formatGender(patient.sex)}
        </InfoItem>
        <InfoItem label="Teléfono">
          {formatPhone(patient.phone)}
        </InfoItem>
        {patient.email && (
          <InfoItem label="Email">
            {patient.email}
          </InfoItem>
        )}
        {patient.address && (
          <InfoItem label="Dirección" fullWidth>
            {patient.address}
          </InfoItem>
        )}
      </dl>

      {/* Emergency Contact */}
      <div className="mt-6 p-4 bg-secondary-50 rounded-lg">
        <h4 className="text-sm font-medium text-secondary-700 mb-2">
          Contacto de Emergencia
        </h4>
        <p className="text-secondary-900">
          {patient.emergencyContactName}
          {patient.emergencyContactRelationship && (
            <span className="text-secondary-500">
              {' '}({patient.emergencyContactRelationship})
            </span>
          )}
        </p>
        <p className="text-secondary-600 text-sm">
          {formatPhone(patient.emergencyContactPhone)}
        </p>
      </div>

      {/* Allergies & Conditions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <AllergyList allergies={patient.allergies} />
        <ConditionList conditions={patient.chronicConditions} />
      </div>
    </ContentCard>
  );
};

// Helper component
const InfoItem: React.FC<{
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ label, children, fullWidth }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <dt className="text-sm text-secondary-500">{label}</dt>
    <dd className="text-secondary-900">{children}</dd>
  </div>
);
```

## PatientSummaryCard

Compact patient display for context.

```typescript
// src/components/patients/PatientSummaryCard.tsx

interface PatientSummaryCardProps {
  patient: Patient;
  showAllergies?: boolean;
}

export const PatientSummaryCard: React.FC<PatientSummaryCardProps> = ({
  patient,
  showAllergies = true,
}) => {
  const age = calculateAge(patient.dateOfBirth);
  const hasAllergies = patient.allergies && patient.allergies.length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary-100 text-primary-700">
            {getInitials(patient.firstName, patient.lastName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="font-semibold text-secondary-900">
            {patient.firstName} {patient.lastName}
          </h3>
          <p className="text-sm text-secondary-500">
            {age} años • {formatGender(patient.sex)} • {formatPhone(patient.phone)}
          </p>
        </div>
      </div>

      {showAllergies && hasAllergies && (
        <div className="mt-3 p-2 bg-warning-50 border border-warning-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-warning-800">
            <AlertCircle size={16} />
            <span className="font-medium">Alergias:</span>
            <span>{patient.allergies.map(a => a.name).join(', ')}</span>
          </div>
        </div>
      )}
    </Card>
  );
};
```

### Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│ ┌────┐  María García López                              │
│ │ MG │  45 años • Femenino • +52 555 123 4567          │
│ └────┘                                                  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ Alergias: Penicilina, Mariscos                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## AllergyList

Displays patient allergies.

```typescript
// src/components/patients/AllergyList.tsx

interface AllergyListProps {
  allergies: Allergy[];
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}

export const AllergyList: React.FC<AllergyListProps> = ({
  allergies,
  editable = false,
  onAdd,
  onRemove,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-secondary-700">Alergias</h4>
      {editable && onAdd && (
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus size={14} className="mr-1" />
          Agregar
        </Button>
      )}
    </div>

    {allergies.length === 0 ? (
      <p className="text-sm text-secondary-500">Sin alergias registradas</p>
    ) : (
      <ul className="space-y-1">
        {allergies.map((allergy) => (
          <li
            key={allergy.id}
            className="flex items-center justify-between p-2 bg-error-50 rounded-md"
          >
            <div>
              <span className="text-sm font-medium text-error-800">
                {allergy.name}
              </span>
              {allergy.severity && (
                <Badge variant="error" className="ml-2">
                  {formatSeverity(allergy.severity)}
                </Badge>
              )}
            </div>
            {editable && onRemove && (
              <button
                onClick={() => onRemove(allergy.id)}
                className="text-error-600 hover:text-error-800"
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

## ConditionList

Displays chronic conditions.

```typescript
// src/components/patients/ConditionList.tsx

interface ConditionListProps {
  conditions: ChronicCondition[];
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}

export const ConditionList: React.FC<ConditionListProps> = ({
  conditions,
  editable = false,
  onAdd,
  onRemove,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-secondary-700">
        Condiciones Crónicas
      </h4>
      {editable && onAdd && (
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus size={14} className="mr-1" />
          Agregar
        </Button>
      )}
    </div>

    {conditions.length === 0 ? (
      <p className="text-sm text-secondary-500">Sin condiciones registradas</p>
    ) : (
      <ul className="space-y-1">
        {conditions.map((condition) => (
          <li
            key={condition.id}
            className="flex items-center justify-between p-2 bg-secondary-50 rounded-md"
          >
            <div>
              <span className="text-sm text-secondary-900">
                {condition.name}
              </span>
              {condition.diagnosedAt && (
                <span className="text-xs text-secondary-500 ml-2">
                  (Desde {formatYear(condition.diagnosedAt)})
                </span>
              )}
            </div>
            {editable && onRemove && (
              <button
                onClick={() => onRemove(condition.id)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

## File Structure

```
src/components/patients/
├── PatientList.tsx
├── PatientCard.tsx
├── PatientCardSkeleton.tsx
├── PatientSearch.tsx
├── PatientForm.tsx
├── PatientInfoCard.tsx
├── PatientSummaryCard.tsx
├── AllergyList.tsx
├── ConditionList.tsx
├── DuplicateWarningDialog.tsx
└── index.ts
```

## Utility Functions

```typescript
// src/utils/patient.ts

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const formatGender = (sex: 'male' | 'female' | 'other'): string => {
  const labels = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
  };
  return labels[sex];
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const formatPhone = (phone: string): string => {
  // Format phone number for display
  // +52 555 123 4567
  return phone;
};
```
