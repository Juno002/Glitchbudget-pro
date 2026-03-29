import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. It will automatically use the GEMINI_API_KEY
// environment variable if not explicitly passed.
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      income, 
      expenses, 
      plannedBudgets, 
      available, 
      daysLeft 
    } = body;

    // Validate if necessary data is present, even minimally
    if (income === undefined || expenses === undefined) {
      return NextResponse.json(
        { error: 'Missing required financial data (income, expenses)' },
        { status: 400 }
      );
    }

    const prompt = `
Eres un vigilante financiero silencioso (Ambient AI) integrado en el dashboard de una app de finanzas.
Tu objetivo es detectar anomalías graves o riesgos inminentes en la siguiente situación financiera actual:
- Ingresos: ${income}
- Gastos: ${expenses}
- Presupuestado (límites por categoría y gasto actual): ${JSON.stringify(plannedBudgets)}
- Disponible libre: ${available}
- Días restantes del mes: ${daysLeft}

Reglas estrictas:
1. REGLA DE SILENCIO: Si el usuario va bien (el ritmo de gasto es proporcional a los días restantes, no ha roto presupuestos importantes, tiene saldo disponible razonable), DEBES responder ÚNICA y EXCLUSIVAMENTE con la palabra: NO_ALERT
2. REGLA DE ALERTA: Si detectas un peligro inminente (ej. gastó el 80% de su ingreso y faltan 20 días, o sobrepasó drásticamente el presupuesto de una categoría vital), escribe una alerta de máximo 1 o 2 oraciones muy breves y directas.
3. CERO frases motivacionales, introducciones o saludos. Ve directo al problema.
4. Todos los montos monetarios en la alerta (si hay) deben usar el prefijo "RD$" y separadores de miles (ej: "RD$4,000").
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';

    return NextResponse.json({ insight: text.trim() });
  } catch (error) {
    console.error('Error in AI Insight route:', error);
    return NextResponse.json(
      { error: 'Error generating insight' },
      { status: 500 }
    );
  }
}
