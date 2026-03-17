import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { currentMonth, previousMonth } = await req.json();

        // Validamos que por lo menos existan datos
        if (!currentMonth || !previousMonth) {
            return NextResponse.json({ error: 'Faltan datos financieros de los meses.' }, { status: 400 });
        }

        const prompt = `Analiza este breve resumen financiero de un usuario comparando dos meses consecutivos:
        - Mes anterior: Ingresos: $${previousMonth.income}, Gastos: $${previousMonth.expenses}, Balance final: $${previousMonth.balance}, Disponible: $${previousMonth.available}
        - Mes actual: Ingresos: $${currentMonth.income}, Gastos: $${currentMonth.expenses}, Balance final: $${currentMonth.balance}, Disponible: $${currentMonth.available}

        Tu objetivo es dar una rápida observación o patrón sobre el rendimiento financiero entre ambos meses (ej. si hay tendencia al alza/baja en gastos o ahorro, variación del balance).
        
        Reglas:
        - Longitud máxima: 2 oraciones.
        - Tono analítico, directo y objetivo. Cero frases de motivación.
        - Menciona el patrón principal que notas.
        - NO uses viñetas ni saltos de línea. Escribe corrido.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                 temperature: 0.3, // Menor temperatura para respuestas consistentes
            }
        });

        const insight = response.text?.trim() || 'Comparativa procesada.';
        return NextResponse.json({ insight });

    } catch (e: any) {
        console.error('Error generating AI monthly insight:', e);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
