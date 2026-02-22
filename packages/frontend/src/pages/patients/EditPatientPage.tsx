import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { usePatient, useUpdatePatient } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import type { BloodType } from '../../types/patient.types';

const patientSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  dateOfBirth: z.string().min(1, 'Fecha de nacimiento requerida'),
  sex: z.enum(['male', 'female', 'other']),
  phone: z.string().min(1, 'Telefono requerido'),
  email: z.string().optional().refine(
    (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Email invalido' }
  ),
  address: z.string().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
  emergencyContactName: z.string().min(1, 'Nombre de contacto de emergencia requerido'),
  emergencyContactPhone: z.string().min(1, 'Telefono de emergencia requerido'),
  emergencyContactRelationship: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading: isLoadingPatient } = usePatient(id!);
  const updatePatient = useUpdatePatient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  });

  const currentSex = watch('sex');
  const currentBloodType = watch('bloodType');

  useEffect(() => {
    if (patient) {
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth.split('T')[0],
        sex: patient.sex,
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        bloodType: patient.bloodType || undefined,
        emergencyContactName: patient.emergencyContactName || '',
        emergencyContactPhone: patient.emergencyContactPhone || '',
        emergencyContactRelationship: patient.emergencyContactRelationship || '',
      });
    }
  }, [patient, reset]);

  const onSubmit = async (data: PatientFormData) => {
    try {
      await updatePatient.mutateAsync({
        id: id!,
        data: {
          ...data,
          email: data.email || null,
          bloodType: data.bloodType || null,
          emergencyContactRelationship: data.emergencyContactRelationship || null,
        },
      });
      navigate(`/patients/${id}`);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  if (isLoadingPatient) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-8 text-red-500">
        Paciente no encontrado
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Editar Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-red-500 text-sm">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de Nacimiento *</Label>
                <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sexo *</Label>
                <Select
                  value={currentSex}
                  onValueChange={(value) => setValue('sex', value as 'male' | 'female' | 'other')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input id="address" {...register('address')} />
            </div>

            {/* Medical Info */}
            <div className="space-y-2">
              <Label htmlFor="bloodType">Tipo de Sangre</Label>
              <Select
                value={currentBloodType || undefined}
                onValueChange={(value) => setValue('bloodType', value as BloodType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contacto de Emergencia *</Label>
                <Input id="emergencyContactName" {...register('emergencyContactName')} />
                {errors.emergencyContactName && (
                  <p className="text-red-500 text-sm">{errors.emergencyContactName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Telefono de Emergencia *</Label>
                <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
                {errors.emergencyContactPhone && (
                  <p className="text-red-500 text-sm">{errors.emergencyContactPhone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelationship">Relacion con el Paciente</Label>
              <Input id="emergencyContactRelationship" {...register('emergencyContactRelationship')} placeholder="Ej: Madre, Esposo, Hijo..." />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={updatePatient.isPending}>
                {updatePatient.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/patients/${id}`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default EditPatientPage;
