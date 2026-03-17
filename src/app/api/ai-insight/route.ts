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
Eres un asistente financiero analítico e integrado en una aplicación de finanzas.
El usuario tiene la siguiente situación financiera actual:
- Ingresos: ${income}
- Gastos: ${expenses}
- Presupuestado (límites de presupuesto): ${plannedBudgets}
- Disponible: ${available}
- Días restantes del mes: ${daysLeft}

Reglas estrictas:
1. Escribe máximo 2 oraciones.
2. Tono directo, analítico, neutral y al grano.
3. CERO frases motivacionales, saludos o despedidas.
4. Da una observación clara basada exclusivamente en estos números (ej. advertencias de gasto, ritmo de gasto vs días restantes, etc).
5. Todos los montos monetarios deben estar formateados con el prefijo "RD$" y usar separadores de miles (ejemplo: "RD$4,000", NUNCA "4000").
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
