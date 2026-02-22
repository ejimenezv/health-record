# Forms & Validation Specification

## Overview

This document defines form handling patterns and validation schemas for MedRecord AI. The application uses:

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Integration between RHF and Zod

## Form Architecture

### Setup

```typescript
// Dependencies
// npm install react-hook-form zod @hookform/resolvers

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
```

### Pattern

```typescript
// 1. Define Zod schema
const schema = z.object({
  field: z.string().min(1, 'Campo requerido'),
});

// 2. Infer TypeScript type
type FormData = z.infer<typeof schema>;

// 3. Use in component
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { field: '' },
});
```

## Validation Schemas

### Login Schema

```typescript
// src/schemas/auth.schema.ts

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

### Register Schema

```typescript
// src/schemas/auth.schema.ts

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El email es requerido')
      .email('Ingresa un email válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe incluir mayúsculas, minúsculas y números'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    firstName: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres'),
    lastName: z
      .string()
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(50, 'El apellido no puede exceder 50 caracteres'),
    specialty: z.string().optional(),
    licenseNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Patient Schema

```typescript
// src/schemas/patient.schema.ts

import { z } from 'zod';

// Phone validation regex (Mexico format)
const phoneRegex = /^(\+52)?[0-9]{10}$/;

// Date validation helpers
const isValidDate = (date: Date) => !isNaN(date.getTime());
const isNotFuture = (date: Date) => date <= new Date();
const isReasonableAge = (date: Date) => {
  const age = new Date().getFullYear() - date.getFullYear();
  return age >= 0 && age <= 150;
};

export const patientSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),
  lastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),
  dateOfBirth: z
    .date({
      required_error: 'La fecha de nacimiento es requerida',
      invalid_type_error: 'Fecha inválida',
    })
    .refine(isValidDate, 'Fecha inválida')
    .refine(isNotFuture, 'La fecha no puede ser futura')
    .refine(isReasonableAge, 'La edad debe estar entre 0 y 150 años'),
  sex: z.enum(['male', 'female', 'other'], {
    required_error: 'El sexo es requerido',
    invalid_type_error: 'Selecciona una opción válida',
  }),

  // Contact Information
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(phoneRegex, 'Ingresa un número de teléfono válido (10 dígitos)'),
  email: z
    .string()
    .email('Ingresa un email válido')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'La dirección no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),

  // Emergency Contact
  emergencyContactName: z
    .string()
    .min(2, 'El nombre del contacto debe tener al menos 2 caracteres')
    .max(100, 'El nombre del contacto no puede exceder 100 caracteres'),
  emergencyContactPhone: z
    .string()
    .min(1, 'El teléfono de emergencia es requerido')
    .regex(phoneRegex, 'Ingresa un número de teléfono válido'),
  emergencyContactRelationship: z
    .string()
    .max(50, 'La relación no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

export type PatientFormData = z.infer<typeof patientSchema>;

// Partial schema for updates
export const updatePatientSchema = patientSchema.partial();
export type UpdatePatientFormData = z.infer<typeof updatePatientSchema>;
```

### Appointment Schema

```typescript
// src/schemas/appointment.schema.ts

import { z } from 'zod';

const appointmentTypes = [
  'new_patient',
  'follow_up',
  'routine_checkup',
  'sick_visit',
  'telehealth',
] as const;

export const appointmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
  scheduledAt: z
    .date({
      required_error: 'La fecha y hora son requeridas',
      invalid_type_error: 'Fecha inválida',
    })
    .refine(
      (date) => date >= new Date(),
      'La cita no puede ser en el pasado'
    )
    .refine(
      (date) => {
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        return date <= maxDate;
      },
      'La cita no puede ser más de 1 año en el futuro'
    ),
  appointmentType: z.enum(appointmentTypes, {
    required_error: 'El tipo de cita es requerido',
    invalid_type_error: 'Tipo de cita inválido',
  }),
  duration: z
    .number()
    .min(5, 'La duración mínima es 5 minutos')
    .max(480, 'La duración máxima es 8 horas')
    .default(30),
  reason: z
    .string()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
```

### Medical Record Schema

```typescript
// src/schemas/medicalRecord.schema.ts

import { z } from 'zod';

// Symptom schema
export const symptomSchema = z.object({
  name: z
    .string()
    .min(2, 'El síntoma debe tener al menos 2 caracteres')
    .max(200, 'El síntoma no puede exceder 200 caracteres'),
  bodySite: z
    .string()
    .max(100, 'La ubicación no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),
  severity: z
    .number()
    .min(1, 'La severidad mínima es 1')
    .max(10, 'La severidad máxima es 10')
    .optional()
    .nullable(),
  duration: z
    .string()
    .max(100, 'La duración no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),
});

export type SymptomFormData = z.infer<typeof symptomSchema>;

// Prescription schema
export const prescriptionSchema = z.object({
  medication: z
    .string()
    .min(2, 'El medicamento debe tener al menos 2 caracteres')
    .max(200, 'El medicamento no puede exceder 200 caracteres'),
  strength: z
    .string()
    .min(1, 'La concentración es requerida')
    .max(50, 'La concentración no puede exceder 50 caracteres'),
  dosage: z
    .string()
    .min(1, 'La dosis es requerida')
    .max(100, 'La dosis no puede exceder 100 caracteres'),
  frequency: z
    .string()
    .min(1, 'La frecuencia es requerida')
    .max(100, 'La frecuencia no puede exceder 100 caracteres'),
  duration: z
    .string()
    .max(50, 'La duración no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva')
    .optional()
    .nullable(),
  refills: z
    .number()
    .int('Los refills deben ser un número entero')
    .min(0, 'Los refills no pueden ser negativos')
    .max(12, 'Máximo 12 refills')
    .optional()
    .nullable(),
  instructions: z
    .string()
    .min(1, 'Las instrucciones son requeridas')
    .max(1000, 'Las instrucciones no pueden exceder 1000 caracteres'),
  indication: z
    .string()
    .max(200, 'La indicación no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
});

export type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

// Full medical record schema
export const medicalRecordSchema = z.object({
  // Subjective
  chiefComplaint: z
    .string()
    .max(500, 'El motivo de consulta no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  historyOfPresentIllness: z
    .string()
    .max(5000, 'La historia no puede exceder 5000 caracteres')
    .optional()
    .or(z.literal('')),
  symptoms: z.array(symptomSchema).optional().default([]),

  // Objective
  physicalExamNotes: z
    .string()
    .max(5000, 'Las notas no pueden exceder 5000 caracteres')
    .optional()
    .or(z.literal('')),

  // Assessment
  diagnosis: z
    .string()
    .max(500, 'El diagnóstico no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  diagnosisNotes: z
    .string()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres')
    .optional()
    .or(z.literal('')),

  // Plan
  prescriptions: z.array(prescriptionSchema).optional().default([]),
  treatmentPlan: z
    .string()
    .max(5000, 'El plan no puede exceder 5000 caracteres')
    .optional()
    .or(z.literal('')),
  followUpInstructions: z
    .string()
    .max(2000, 'Las instrucciones no pueden exceder 2000 caracteres')
    .optional()
    .or(z.literal('')),
  patientEducation: z
    .string()
    .max(2000, 'La educación no puede exceder 2000 caracteres')
    .optional()
    .or(z.literal('')),
});

export type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

// Completion validation (requires diagnosis)
export const medicalRecordCompletionSchema = medicalRecordSchema.refine(
  (data) => data.diagnosis && data.diagnosis.length > 0,
  {
    message: 'El diagnóstico es requerido para completar el expediente',
    path: ['diagnosis'],
  }
);
```

### Allergy Schema

```typescript
// src/schemas/allergy.schema.ts

import { z } from 'zod';

const severityLevels = ['mild', 'moderate', 'severe'] as const;

export const allergySchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  severity: z.enum(severityLevels, {
    required_error: 'La severidad es requerida',
  }),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type AllergyFormData = z.infer<typeof allergySchema>;
```

### Chronic Condition Schema

```typescript
// src/schemas/condition.schema.ts

import { z } from 'zod';

export const conditionSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  diagnosedAt: z
    .date()
    .optional()
    .nullable()
    .refine(
      (date) => !date || date <= new Date(),
      'La fecha no puede ser futura'
    ),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type ConditionFormData = z.infer<typeof conditionSchema>;
```

## Form Components Integration

### Form Wrapper with shadcn/ui

```typescript
// src/components/ui/form.tsx (shadcn/ui pattern)

import * as React from 'react';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    name: fieldContext.name,
    ...fieldState,
  };
};

// FormItem, FormLabel, FormControl, FormMessage components...
// (Standard shadcn/ui implementation)

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
```

### Example Form Implementation

```typescript
// src/components/patients/PatientForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, PatientFormData } from '@/schemas/patient.schema';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PatientFormProps {
  defaultValues?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  isLoading?: boolean;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  defaultValues,
  onSubmit,
  isLoading,
}) => {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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

        {/* ... more fields */}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </form>
    </Form>
  );
};
```

## Form Validation Messages (Spanish)

### Standard Messages

```typescript
// src/lib/validationMessages.ts

export const validationMessages = {
  required: (field: string) => `${field} es requerido`,
  min: (field: string, min: number) =>
    `${field} debe tener al menos ${min} caracteres`,
  max: (field: string, max: number) =>
    `${field} no puede exceder ${max} caracteres`,
  email: 'Ingresa un email válido',
  phone: 'Ingresa un número de teléfono válido',
  date: {
    invalid: 'Fecha inválida',
    future: 'La fecha no puede ser futura',
    past: 'La fecha no puede ser en el pasado',
  },
  number: {
    positive: 'El valor debe ser positivo',
    integer: 'El valor debe ser un número entero',
    min: (min: number) => `El valor mínimo es ${min}`,
    max: (max: number) => `El valor máximo es ${max}`,
  },
  select: 'Selecciona una opción',
  match: (field: string) => `Los campos de ${field} no coinciden`,
};
```

### Custom Error Map

```typescript
// src/lib/zodErrorMap.ts

import { z } from 'zod';

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // Handle specific error types
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) {
          return { message: 'Este campo es requerido' };
        }
        return {
          message: `Debe tener al menos ${issue.minimum} caracteres`,
        };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return {
          message: `No puede exceder ${issue.maximum} caracteres`,
        };
      }
      break;
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string' && issue.received === 'undefined') {
        return { message: 'Este campo es requerido' };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: 'Ingresa un email válido' };
      }
      break;
  }

  return { message: ctx.defaultError };
};

// Set as default
z.setErrorMap(customErrorMap);
```

## Form Utilities

### Phone Input Formatting

```typescript
// src/components/ui/phone-input.tsx

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';

export interface PhoneInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, value, ...props }, ref) => {
    const formatPhone = (input: string): string => {
      // Remove non-digits
      const digits = input.replace(/\D/g, '');

      // Format as: +52 555 123 4567
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      if (digits.length <= 8)
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      const event = {
        ...e,
        target: { ...e.target, value: formatted },
      };
      onChange?.(event as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        placeholder="+52 555 123 4567"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
```

### Character Counter

```typescript
// src/components/ui/character-count.tsx

interface CharacterCountProps {
  current: number;
  max: number;
  className?: string;
}

export const CharacterCount: React.FC<CharacterCountProps> = ({
  current,
  max,
  className,
}) => {
  const isNearLimit = current > max * 0.8;
  const isOverLimit = current > max;

  return (
    <span
      className={cn(
        'text-xs text-secondary-500',
        isNearLimit && 'text-warning-600',
        isOverLimit && 'text-error-600',
        className
      )}
    >
      {current}/{max}
    </span>
  );
};
```

### Date Picker

```typescript
// src/components/ui/date-picker.tsx

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled,
  minDate,
  maxDate,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-secondary-500'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, 'dd/MM/yyyy', { locale: es })
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={es}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
```

## File Structure

```
src/
├── schemas/
│   ├── auth.schema.ts
│   ├── patient.schema.ts
│   ├── appointment.schema.ts
│   ├── medicalRecord.schema.ts
│   ├── allergy.schema.ts
│   └── condition.schema.ts
├── lib/
│   ├── validationMessages.ts
│   └── zodErrorMap.ts
└── components/
    └── ui/
        ├── form.tsx
        ├── phone-input.tsx
        ├── date-picker.tsx
        └── character-count.tsx
```
