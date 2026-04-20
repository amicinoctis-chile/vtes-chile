/** Formato moneda chilena.
 *  - `undefined` → "Por confirmar"
 *  - `0`         → "Gratuito"
 *  - `> 0`       → moneda CLP */
export const formatCLP = (n: number | undefined): string =>
  n === undefined
    ? 'Por confirmar'
    : n === 0
      ? 'Gratuito'
      : n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/** Normaliza un string de fecha para evitar desfase de zona horaria.
 *  - Dates sin hora ("2026-04-26") → agrega T12:00:00
 *  - Datetimes a medianoche ("…T00:00:00" / "…T00:00:00Z") → reemplaza por T12:00:00
 */
const normalizeDateStr = (s: string): string => {
  if (!s.includes('T')) return s + 'T12:00:00';
  return s.replace(/T00:00:00Z?$/, 'T12:00:00');
};

/** Fecha larga en español (ej: "26 de abril de 2026"). */
export const formatDateLong = (s: string): string =>
  new Date(normalizeDateStr(s)).toLocaleDateString('es-CL', { dateStyle: 'long' });

/** Fecha media en español (ej: "26 abr 2026"). */
export const formatDateMedium = (s: string): string =>
  new Date(normalizeDateStr(s)).toLocaleDateString('es-CL', { dateStyle: 'medium' });

/** Rango horario de un evento. Si es de un día: "HH:MM - HH:MM".
 *  Si cruza días: fecha+hora completas en ambos extremos. */
export const formatEventSchedule = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): string =>
  startDate === endDate
    ? `${startTime} - ${endTime}`
    : `${formatDateLong(startDate)} · ${startTime} — ${formatDateLong(endDate)} · ${endTime}`;

/** Etiqueta legible para el campo proxyesAllowed. */
export const proxyLabel = (v: string): string =>
  v === 'si' ? 'Sí' : v === 'no' ? 'No' : 'Por confirmar';

/** Primera letra en mayúscula. */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** Nombres de meses en español (índice 1-12). */
export const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
