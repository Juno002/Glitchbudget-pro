import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      description,
      amount,
      category,
      budgetForCategory,
      available
    } = body;

    if (amount === undefined || category === undefined) {
      return NextResponse.json(
        { error: 'Missing required transaction data' },
        { status: 400 }
      );
    }

    let budgetContext = "No hay presupuesto definido para esta categoría.";
    if (budgetForCategory) {
        budgetContext = `El presupuesto límite para ${category} es ${budgetForCategory.limit}, con este gasto se han gastado ${budgetForCategory.spent}. (Quedan ${budgetForCategory.limit - budgetForCategory.spent})`;
    }

    const prompt = `
Eres un analista financiero silencioso e integrado en una aplicación de finanzas.
El usuario acaba de registrar el siguiente gasto:
- Concepto: "${description}"
- Monto: ${amount}
- Categoría: ${category}
- Contexto de presupuesto: ${budgetContext}
- Disponible mensual restante en general: ${available}

Reglas estrictas:
1. Escribe máximo 2 oraciones.
2. Tono directo, clínico, neutral y al grano.
3. CERO frases motivacionales, saludos, o regaños morales.
4. Da una observación clara basada exclusivamente en el impacto de este gasto en su presupuesto de la categoría o en su disponible restante. (ej. "El gasto consume el X% del presupuesto de comida", "Se excedió el límite de transporte", "Queda disponible general ajustado a Y").
5. Todos los montos monetarios deben estar formateados con el prefijo "RD$" y usar separadores de miles (ejemplo: "RD$4,000", NUNCA "4000").
`;

    // Safety bypass: Gemini generation disabled internally
    /*
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    */
    const text = '';

    return NextResponse.json({ insight: text.trim() });
  } catch (error) {
    console.error('Error in AI Transaction Insight route:', error);
    return NextResponse.json(
      { error: 'Error generating insight' },
      { status: 500 }
    );
  }
}
