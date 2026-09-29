# Fase 16 — Plan de ejecución en siete iteraciones

Fuente funcional: `Roadmap septiembre 2026.txt`, Fase 16.

Este documento fija la división de ejecución acordada para completar Fase 16. El roadmap funcional sigue siendo la fuente de verdad del alcance; esta página únicamente descompone ese alcance en checkpoints verificables.

## Iteraciones

1. **16.1 — Contrato de Rules**
   - modelo;
   - condiciones soportadas;
   - acciones permitidas;
   - sin UI compleja.

2. **16.2 — Motor determinista**
   - evaluar reglas como `description contains "Spotify"`;
   - devolver sugerencias;
   - sin escrituras automáticas.

3. **16.3 — Rule suggestions en Quick Add**
   - mostrar sugerencias de clasificación;
   - aceptar o ignorar explícitamente.

4. **16.4 — Gestión de reglas**
   - crear;
   - editar;
   - activar/desactivar;
   - ordenar;
   - eliminar;
   - todo local.

5. **16.5 — Integración Templates → Saved Filters → Rules**
   - Templates primero como presets;
   - Saved Filters como vistas;
   - Rules como clasificación;
   - sin competir ni fusionar responsabilidades.

6. **16.6 — Apply automatically opcional** ✅
   - opt-in explícito **por regla**;
   - legacy permanece manual por defecto;
   - una sola coincidencia automática compatible puede rellenar clasificación;
   - múltiples coincidencias automáticas caen a decisión manual, sin precedencia implícita;
   - motor determinista y local.

7. **16.7 — Hardening + gate** ✅
   - conflictos y precedencia formalizados;
   - legacy endurecido;
   - backup JSON v12 incluye Templates, Saved Filters y Rules;
   - regresiones completas;
   - documentación y cierre formal.

## Invariantes de toda la fase

Durante 16.1–16.7:

- cero IA;
- cero transmisión de descripciones;
- cero dependencia de red para evaluar o aplicar rules;
- cualquier automatización debe seguir siendo determinista;
- no avanzar a la siguiente fase del roadmap antes de completar 16.7 y su gate.

## Estado actual

- 16.1 ✅
- 16.2 ✅
- 16.3 ✅
- 16.4 ✅
- 16.5 ✅
- 16.6 ✅
- 16.7 ✅

Por tanto, **Fase 16 queda completada**.
