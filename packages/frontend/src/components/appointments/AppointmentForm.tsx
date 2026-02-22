import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { AppointmentType, CreateAppointmentRequest } from '../../types/appointment.types';

const appointmentSchema = z.object({
  patientId: z.string().uuid('ID de paciente invalido'),
  appointmentDate: z.string().min(1, 'La fecha es requerida'),
  appointmentTime: z.string().min(1, 'La hora es requerida'),
  appointmentType: z.enum(['new_patient', 'follow_up', 'routine_checkup', 'sick_visit', 'telehealth'], {
    errorMap: () => ({ message: 'Tipo de cita invalido' }),
  }),
  reasonForVisit: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().min(5).max(480).default(30),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  patientId?: string;
  patientName?: string;
  defaultValues?: Partial<AppointmentFormData>;
  onSubmit: (data: CreateAppointmentRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

function getDefaultDateTime(): { date: string; time: string } {
  const now = new Date();
  // Round to nearest 15 minutes
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(minutes, 0, 0);

  const date = now.toISOString().split('T')[0] as string;
  const time = now.toTimeString().slice(0, 5);

  return { date, time };
}

const appointmentTypes: { value: AppointmentType; label: string }[] = [
  { value: 'new_patient', label: 'Nuevo Paciente' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'routine_checkup', label: 'Chequeo de Rutina' },
  { value: 'sick_visit', label: 'Consulta por Enfermedad' },
  { value: 'telehealth', label: 'Telemedicina' },
];

const durationOptions = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
];

export function AppointmentForm({
  patientId,
  patientName,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}: AppointmentFormProps) {
  const defaults = getDefaultDateTime();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: patientId || '',
      appointmentDate: defaultValues?.appointmentDate || defaults.date,
      appointmentTime: defaultValues?.appointmentTime || defaults.time,
      appointmentType: defaultValues?.appointmentType || 'follow_up',
      reasonForVisit: defaultValues?.reasonForVisit || '',
      durationMinutes: defaultValues?.durationMinutes || 30,
    },
  });

  const selectedType = watch('appointmentType');
  const selectedDuration = watch('durationMinutes');

  const handleFormSubmit = async (data: AppointmentFormData) => {
    const appointmentDate = new Date(`${data.appointmentDate}T${data.appointmentTime}`).toISOString();

    const submitData: CreateAppointmentRequest = {
      patientId: data.patientId,
      appointmentDate,
      appointmentType: data.appointmentType,
      reasonForVisit: data.reasonForVisit || null,
      durationMinutes: data.durationMinutes,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {patientName && (
        <div>
          <Label>Paciente</Label>
          <p className="text-lg font-medium">{patientName}</p>
          <input type="hidden" {...register('patientId')} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="appointmentDate">Fecha *</Label>
          <Input
            id="appointmentDate"
            type="date"
            {...register('appointmentDate')}
            className={errors.appointmentDate ? 'border-red-500' : ''}
          />
          {errors.appointmentDate && (
            <p className="text-red-500 text-sm mt-1">{errors.appointmentDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="appointmentTime">Hora *</Label>
          <Input
            id="appointmentTime"
            type="time"
            {...register('appointmentTime')}
            className={errors.appointmentTime ? 'border-red-500' : ''}
          />
          {errors.appointmentTime && (
            <p className="text-red-500 text-sm mt-1">{errors.appointmentTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Cita *</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => setValue('appointmentType', value as AppointmentType)}
          >
            <SelectTrigger className={errors.appointmentType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Seleccionar tipo..." />
            </SelectTrigger>
            <SelectContent>
              {appointmentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.appointmentType && (
            <p className="text-red-500 text-sm mt-1">{errors.appointmentType.message}</p>
          )}
        </div>

        <div>
          <Label>Duracion *</Label>
          <Select
            value={selectedDuration?.toString()}
            onValueChange={(value) => setValue('durationMinutes', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar duracion..." />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="reasonForVisit">Motivo de la Consulta</Label>
        <Textarea
          id="reasonForVisit"
          {...register('reasonForVisit')}
          placeholder="Descripcion del motivo de la cita..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : isEdit ? 'Actualizar Cita' : 'Crear Cita'}
        </Button>
      </div>
    </form>
  );
}

export default AppointmentForm;
