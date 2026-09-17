'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function HelpDialog() {
  return <Dialog><DialogTrigger asChild><Button variant="ghost" className="w-full justify-start">Ayuda y privacidad</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Tu presupuesto, en tu dispositivo</DialogTitle><DialogDescription>Guía rápida · Versión 0.1.0 · En evaluación</DialogDescription></DialogHeader>
    <div className="space-y-4 text-sm leading-relaxed text-foreground">
      <section><h3 className="font-semibold">Para empezar</h3><p>Define tu ingreso principal en Ajustes, asigna presupuestos en Planificación y usa el botón + para registrar movimientos. La fecha del movimiento determina su mes.</p></section>
      <section><h3 className="font-semibold">Cómo leer el disponible</h3><p>Se descuentan los gastos en efectivo, pagos de tarjetas, aportes a metas, ahorro sugerido y la parte sin gastar de tus presupuestos. Una compra con tarjeta consume presupuesto; el efectivo se descuenta al registrar el pago.</p></section>
      <section><h3 className="font-semibold">Conserva una copia fuera de la app</h3><p>En Copias de seguridad, exporta un JSON antes de cambiar de navegador, de dirección de la app o de dispositivo. Importarlo reemplaza los datos actuales. Los archivos no están cifrados.</p></section>
      <section><h3 className="font-semibold">Privacidad y almacenamiento</h3><p>Los movimientos se guardan en este navegador. No hay cuenta ni sincronización. Borrar los datos del sitio elimina los movimientos y las copias locales. El modo privado puede descartar los datos al cerrarlo.</p></section>
      <section><h3 className="font-semibold">Instalación y actualizaciones</h3><p>La primera apertura necesita conexión. Después de preparar el modo sin conexión, puedes usar la app sin internet. Si aparece una actualización, guarda los formularios y cierra todas sus ventanas antes de volver a abrirla.</p></section>
    </div></DialogContent></Dialog>;
}
