'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function HelpDialog() {
  return <Dialog><DialogTrigger asChild><Button variant="ghost" className="w-full justify-start">Ayuda y privacidad</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Tu presupuesto, en tu dispositivo</DialogTitle><DialogDescription>Guía rápida · Versión 0.1.0 · En evaluación</DialogDescription></DialogHeader>
    <div className="space-y-4 text-sm leading-relaxed text-foreground">
      <section><h3 className="font-semibold">Para empezar</h3><p>Registra los cobros reales con el botón +: entran en Efectivo. Configura tus saldos iniciales en Movimientos y asigna presupuestos en Plan. La fecha del movimiento determina su mes.</p></section>
      <section><h3 className="font-semibold">Cómo leer el resumen</h3><p>Dinero en cuentas hoy suma efectivo y bancos. Ingresos y Gastos corresponden al mes seleccionado: una compra con tarjeta es un gasto y aumenta la deuda. Pagarla reduce el saldo de la cuenta y la deuda, sin repetir el gasto. El ahorro sugerido no es un saldo ahorrado.</p></section>
      <section><h3 className="font-semibold">Tus cuentas y el presupuesto</h3><p>Mi dinero hoy suma el efectivo y los bancos que registres desde su saldo inicial. Los retiros y depósitos entre tus cuentas son transferencias, no ingresos ni gastos. El sueldo configurado es una previsión y no se suma a los ingresos registrados. Un gasto fijo se cuenta una sola vez; registra cada pago posterior, o usa Suscripciones. El modo estricto comprueba el saldo de la cuenta elegida; el disponible mensual sigue siendo una referencia de planificación. Reservar ahorro o aportar a una meta no mueve dinero entre bancos: registra una transferencia si lo trasladas.</p></section>
      <section><h3 className="font-semibold">Conserva una copia fuera de la app</h3><p>En Copias de seguridad, exporta un JSON antes de cambiar de navegador, de dirección de la app o de dispositivo. Importarlo reemplaza los datos actuales. Los archivos no están cifrados.</p></section>
      <section><h3 className="font-semibold">Privacidad y almacenamiento</h3><p>Los movimientos se guardan en este navegador. No hay cuenta ni sincronización. Borrar los datos del sitio elimina los movimientos y las copias locales. El modo privado puede descartar los datos al cerrarlo.</p></section>
      <section><h3 className="font-semibold">Instalación y actualizaciones</h3><p>La primera apertura necesita conexión. Después de preparar el modo sin conexión, puedes usar la app sin internet. Si aparece una actualización, guarda los formularios y cierra todas sus ventanas antes de volver a abrirla.</p></section>
    </div></DialogContent></Dialog>;
}
