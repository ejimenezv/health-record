# Appointment Components Specification

## Overview

This document specifies the components used for appointment management, including appointment lists, cards, forms, and timeline views.

## Component List

| Component | Description | Used In |
|-----------|-------------|---------|
| `AppointmentTimeline` | Timeline view of appointments | PatientDetailPage |
| `AppointmentTimelineItem` | Single timeline entry | AppointmentTimeline |
| `AppointmentCard` | Compact appointment display | Dashboard |
| `AppointmentForm` | Create appointment form | NewAppointmentPage |
| `AppointmentHeader` | Appointment page header | AppointmentPage |
| `AppointmentStatusBadge` | Status indicator | Various |
| `AppointmentTypeBadge` | Type indicator | Various |
| `DateTimePicker` | Date and time selection | AppointmentForm |

## AppointmentTimeline

Vertical timeline display of patient appointments.

```typescript
// src/components/appointments/AppointmentTimeline.tsx

interface AppointmentTimelineProps {
  appointments: Appointment[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (appointment: Appointment) => void;
  emptyState?: React.ReactNode;
}

export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({
  appointments,
  isLoading,
  hasMore,
  onLoadMore,
  onSelect,
  emptyState,
}) => {
  if (isLoading && appointments.length === 0) {
    return <AppointmentTimelineSkeleton />;
  }

  if (appointments.length === 0) {
    return emptyState || <DefaultEmptyState />;
  }

  // Group appointments by date
  const groupedAppointments = groupByDate(appointments);

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-secondary-200" />

      <div className="space-y-6">
        {Object.entries(groupedAppointments).map(([date, items]) => (
          <div key={date}>
            {/* Date header */}
            <div className="relative flex items-center mb-3">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-secondary-300 border-2 border-white" />
              <span className="ml-10 text-sm font-medium text-secondary-700">
                {formatDateHeader(date)}
              </span>
            </div>

            {/* Appointments for this date */}
            <div className="space-y-3 ml-10">
              {items.map((appointment) => (
                <AppointmentTimelineItem
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => onSelect(appointment)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 ml-10">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cargar Más Citas
          </Button>
        </div>
      )}
    </div>
  );
};
```

### Visual Structure

```
  ○─── 15 Ene 2024 ────────────────────────────────────
  │
  │   ┌─────────────────────────────────────────────┐
  │   │ Consulta de Seguimiento          [Completada]│
  │   │ Dr. García • Dolor de cabeza                │
  │   │ Dx: Migraña                                 │
  │   │                                    [Ver →]  │
  │   └─────────────────────────────────────────────┘
  │
  ○─── 10 Dic 2023 ────────────────────────────────────
  │
  │   ┌─────────────────────────────────────────────┐
  │   │ Revisión Rutinaria               [Completada]│
  │   │ Dr. García • Chequeo anual                  │
  │   │ Dx: Sin hallazgos                           │
  │   │                                    [Ver →]  │
  │   └─────────────────────────────────────────────┘
  │
  ○─── 5 Sep 2023 ─────────────────────────────────────
```

## AppointmentTimelineItem

Single appointment entry in the timeline.

```typescript
// src/components/appointments/AppointmentTimelineItem.tsx

interface AppointmentTimelineItemProps {
  appointment: Appointment;
  onClick: () => void;
}

export const AppointmentTimelineItem: React.FC<AppointmentTimelineItemProps> = ({
  appointment,
  onClick,
}) => {
  const hasMedicalRecord = !!appointment.medicalRecord;

  return (
    <Card
      variant="interactive"
      className="p-4"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Type and Status */}
          <div className="flex items-center gap-2 mb-1">
            <AppointmentTypeBadge type={appointment.appointmentType} />
            <AppointmentStatusBadge status={appointment.status} />
          </div>

          {/* Time */}
          <p className="text-sm text-secondary-600">
            {formatTime(appointment.scheduledAt)}
          </p>

          {/* Reason */}
          {appointment.reason && (
            <p className="mt-2 text-sm text-secondary-700 line-clamp-2">
              {appointment.reason}
            </p>
          )}

          {/* Diagnosis (if completed) */}
          {hasMedicalRecord && appointment.medicalRecord.diagnosis && (
            <p className="mt-2 text-sm">
              <span className="text-secondary-500">Dx: </span>
              <span className="text-secondary-900">
                {appointment.medicalRecord.diagnosis}
              </span>
            </p>
          )}
        </div>

        {/* View action */}
        <Button variant="ghost" size="sm">
          Ver
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </Card>
  );
};
```

## AppointmentCard

Compact appointment card for dashboard and lists.

```typescript
// src/components/appointments/AppointmentCard.tsx

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  showPatient?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  showPatient = false,
}) => (
  <Card
    variant="interactive"
    className="p-4"
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div>
        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <Calendar size={14} />
          <span>{formatDate(appointment.scheduledAt)}</span>
          <span>•</span>
          <Clock size={14} />
          <span>{formatTime(appointment.scheduledAt)}</span>
        </div>

        {/* Patient (if shown) */}
        {showPatient && appointment.patient && (
          <p className="mt-1 font-medium text-secondary-900">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
        )}

        {/* Type */}
        <div className="mt-2">
          <AppointmentTypeBadge type={appointment.appointmentType} />
        </div>

        {/* Reason */}
        {appointment.reason && (
          <p className="mt-2 text-sm text-secondary-600 line-clamp-1">
            {appointment.reason}
          </p>
        )}
      </div>

      <AppointmentStatusBadge status={appointment.status} />
    </div>
  </Card>
);
```

## AppointmentForm

Form for creating new appointments.

```typescript
// src/components/appointments/AppointmentForm.tsx

interface AppointmentFormProps {
  patientId: string;
  onSubmit: (data: CreateAppointmentData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface CreateAppointmentData {
  patientId: string;
  scheduledAt: Date;
  appointmentType: AppointmentType;
  duration: number;
  reason?: string;
}

type AppointmentType =
  | 'new_patient'
  | 'follow_up'
  | 'routine_checkup'
  | 'sick_visit'
  | 'telehealth';

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  patientId,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const form = useForm<CreateAppointmentData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId,
      scheduledAt: getNextTimeSlot(),
      appointmentType: 'follow_up',
      duration: 30,
      reason: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha y Hora *</FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={new Date()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Appointment Type */}
        <FormField
          control={form.control}
          name="appointmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cita *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="new_patient">Paciente Nuevo</SelectItem>
                  <SelectItem value="follow_up">Consulta de Seguimiento</SelectItem>
                  <SelectItem value="routine_checkup">Revisión Rutinaria</SelectItem>
                  <SelectItem value="sick_visit">Consulta por Enfermedad</SelectItem>
                  <SelectItem value="telehealth">Telemedicina</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reason */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de la Consulta</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe el motivo de la consulta..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/500 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar Cita
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

## AppointmentHeader

Header for the appointment page with patient info and actions.

```typescript
// src/components/appointments/AppointmentHeader.tsx

interface AppointmentHeaderProps {
  appointment: Appointment;
  patient: Patient;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onComplete: () => void;
  onClose: () => void;
}

export const AppointmentHeader: React.FC<AppointmentHeaderProps> = ({
  appointment,
  patient,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onComplete,
  onClose,
}) => {
  const isCompleted = appointment.status === 'completed';

  return (
    <div className="bg-white border-b border-secondary-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Patient and Date Info */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-secondary-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-secondary-600">
            <Calendar size={14} />
            <span>{formatDate(appointment.scheduledAt)}</span>
            <span>•</span>
            <Clock size={14} />
            <span>{formatTime(appointment.scheduledAt)}</span>
            <span>•</span>
            <AppointmentTypeBadge type={appointment.appointmentType} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Unsaved indicator */}
          {hasUnsavedChanges && (
            <span className="text-sm text-warning-600 mr-2">
              Cambios sin guardar
            </span>
          )}

          {/* Save button */}
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Guardar
          </Button>

          {/* Complete button */}
          {!isCompleted && (
            <Button onClick={onComplete}>
              <Check size={16} className="mr-2" />
              Completar
            </Button>
          )}

          {/* Close button */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Visual Structure

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│ María García López                     [En Progreso]                      │
│ 📅 15 Ene 2024 • ⏰ 10:30 AM • [Seguimiento]                              │
│                                                                           │
│                           Cambios sin guardar  [Guardar] [Completar] [✕] │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## AppointmentStatusBadge

Status indicator badge.

```typescript
// src/components/appointments/AppointmentStatusBadge.tsx

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const statusConfig: Record<AppointmentStatus, { label: string; variant: string }> = {
  scheduled: { label: 'Programada', variant: 'primary' },
  checked_in: { label: 'Registrado', variant: 'warning' },
  in_progress: { label: 'En Progreso', variant: 'warning' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'default' },
  no_show: { label: 'No Asistió', variant: 'error' },
};

export const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({
  status,
}) => {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

## AppointmentTypeBadge

Appointment type indicator.

```typescript
// src/components/appointments/AppointmentTypeBadge.tsx

interface AppointmentTypeBadgeProps {
  type: AppointmentType;
}

const typeConfig: Record<AppointmentType, { label: string; icon: LucideIcon }> = {
  new_patient: { label: 'Paciente Nuevo', icon: UserPlus },
  follow_up: { label: 'Seguimiento', icon: RefreshCw },
  routine_checkup: { label: 'Revisión', icon: ClipboardCheck },
  sick_visit: { label: 'Enfermedad', icon: Thermometer },
  telehealth: { label: 'Telemedicina', icon: Video },
};

export const AppointmentTypeBadge: React.FC<AppointmentTypeBadgeProps> = ({
  type,
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant="default" className="gap-1">
      <Icon size={12} />
      {config.label}
    </Badge>
  );
};
```

## DateTimePicker

Combined date and time picker component.

```typescript
// src/components/appointments/DateTimePicker.tsx

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateChange = (date: Date) => {
    const newDateTime = new Date(date);
    newDateTime.setHours(value.getHours(), value.getMinutes());
    onChange(newDateTime);
  };

  const handleTimeChange = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const newDateTime = new Date(value);
    newDateTime.setHours(hours, minutes);
    onChange(newDateTime);
  };

  return (
    <div className="flex gap-2">
      {/* Date Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 justify-start"
            disabled={disabled}
          >
            <CalendarIcon size={16} className="mr-2" />
            {formatDate(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                handleDateChange(date);
                setIsOpen(false);
              }
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      <Select
        value={formatTimeValue(value)}
        onValueChange={handleTimeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <Clock size={16} className="mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {generateTimeSlots().map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Generate 30-minute time slots from 8:00 AM to 8:00 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = formatTimeLabel(hour, minute);
      slots.push({ value, label });
    }
  }
  return slots;
};

const formatTimeLabel = (hour: number, minute: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};
```

## File Structure

```
src/components/appointments/
├── AppointmentTimeline.tsx
├── AppointmentTimelineItem.tsx
├── AppointmentTimelineSkeleton.tsx
├── AppointmentCard.tsx
├── AppointmentForm.tsx
├── AppointmentHeader.tsx
├── AppointmentStatusBadge.tsx
├── AppointmentTypeBadge.tsx
├── DateTimePicker.tsx
└── index.ts
```

## Utility Functions

```typescript
// src/utils/appointment.ts

export const getNextTimeSlot = (): Date => {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 30) * 30;
  now.setMinutes(roundedMinutes, 0, 0);
  if (roundedMinutes >= 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  }
  return now;
};

export const groupByDate = (
  appointments: Appointment[]
): Record<string, Appointment[]> => {
  return appointments.reduce((acc, appointment) => {
    const date = formatDateKey(appointment.scheduledAt);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);
};

export const formatDateHeader = (dateKey: string): string => {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'Hoy';
  if (isSameDay(date, yesterday)) return 'Ayer';
  return formatDate(date);
};
```
