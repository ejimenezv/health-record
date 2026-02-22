import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';

export function PatientsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePatients({
    search: search || undefined,
    page,
    limit: 10,
  });

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

  const getGenderLabel = (gender: string): string => {
    const labels: Record<string, string> = {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro',
    };
    return labels[gender] || gender;
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error al cargar pacientes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button onClick={() => navigate('/patients/new')}>
          Nuevo Paciente
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nombre, email o telefono..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {data?.data.map((patient) => (
              <Card
                key={patient.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {calculateAge(patient.dateOfBirth)} anos - {getGenderLabel(patient.sex)}
                      </p>
                      {patient.phone && (
                        <p className="text-gray-500 text-sm">{patient.phone}</p>
                      )}
                      {patient.email && (
                        <p className="text-gray-500 text-sm">{patient.email}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{patient._count?.appointments || 0} citas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="py-2 px-4 text-gray-600">
                Pagina {page} de {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PatientsListPage;
