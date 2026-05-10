import PatientForm from '@/components/PatientForm'

export default function NewPatientPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '4rem auto', padding: '0 2rem' }}>
      <div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Cadastrar Paciente</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Insira os dados do paciente para entrada na fila de regulação.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <PatientForm />
      </div>
    </div>
  )
}
