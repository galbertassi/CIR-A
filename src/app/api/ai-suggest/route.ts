import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { patient } = await request.json();

    if (!patient) {
      return NextResponse.json({ error: 'Patient data required' }, { status: 400 });
    }

    // Heuristics for the simulated AI suggestion
    let suggestion = '';

    if (patient.severity === 'CRITICAL') {
      suggestion = '⚠️ Paciente Crítico: Recomenda-se vaga zero ou estabilização imediata no local.';
    } else if (patient.attempts_count > 2) {
      suggestion = '💡 Múltiplas recusas detectadas. Expandir o perfil de busca incluindo a rede privada associada (ex: HFOA, Viver Mais).';
    } else if (patient.severity === 'HIGH') {
      suggestion = '🏥 Prioridade de transferência para Unidades de Terapia Intensiva dos pólos principais (São João Batista / Retiro).';
    } else {
      suggestion = '✅ Fluxo padrão. Tentar hospitais de retaguarda para desocupar leitos de porta.';
    }

    // Em uma implementação real, chamaríamos a API LLM (ex: Gemini/OpenAI) aqui.
    // fetch('https://api.openai.com/...', ...)

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao gerar sugestão' }, { status: 500 });
  }
}
