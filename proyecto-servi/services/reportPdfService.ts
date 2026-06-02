import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { resolveEvidenceImageDataUri, cleanupTempFiles } from '../lib/evidenceImage';
import { formatUbicacionAddress } from '../lib/ubicacionAddress';
import type { BitacoraFormulario } from '../types/models';
import type { AdminBitacoraDetail, AdminEvidenciaRow, AdminSosRow } from './adminService';

/** Paleta alineada con tailwind.config.js (servi-*) */
const PDF = {
  fondo: '#0B1F17',
  superficie: '#143528',
  primario: '#1B7A4E',
  primarioOscuro: '#145A3A',
  acento: '#F97316',
  acentoClaro: '#FDBA74',
  texto: '#FFFFFF',
  textoOscuro: '#0B1F17',
  suave: '#A7C4B5',
  suaveOscuro: '#5A7A68',
  borde: '#2D5A45',
  exito: '#22C55E',
  completado: '#0EA5E9',
  peligro: '#DC2626',
  pageBg: '#F4FAF6',
  cardBg: '#FFFFFF',
  cellBg: '#EDF5F0',
};

function esc(text: string | null | undefined): string {
  if (!text) return '—';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseFirmaDataUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('data:image')) return raw;
  try {
    const parsed = JSON.parse(raw) as { data?: string; sin_firma?: boolean };
    if (parsed.sin_firma) return undefined;
    if (parsed.data?.startsWith('data:image')) return parsed.data;
  } catch {
    return undefined;
  }
  return undefined;
}

function cell(label: string, value: string | null | undefined): string {
  return `<div class="cell"><div class="lbl">${esc(label)}</div><div class="val">${esc(value)}</div></div>`;
}

function estadoBadge(estado: string): string {
  const map: Record<string, { bg: string; color: string }> = {
    activo: { bg: PDF.exito, color: PDF.fondo },
    completado: { bg: PDF.completado, color: PDF.texto },
    pendiente: { bg: PDF.suaveOscuro, color: PDF.texto },
    cancelado: { bg: PDF.peligro, color: PDF.texto },
  };
  const style = map[estado] ?? { bg: PDF.acento, color: PDF.fondo };
  return `<span class="badge" style="background:${style.bg};color:${style.color}">${esc(estado)}</span>`;
}

function pdfStyles(): string {
  return `
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    color: ${PDF.textoOscuro};
    font-size: 11px;
    margin: 0;
    line-height: 1.5;
    background: ${PDF.pageBg};
  }
  .cover {
    background: linear-gradient(135deg, ${PDF.fondo} 0%, ${PDF.superficie} 55%, ${PDF.primarioOscuro} 100%);
    color: ${PDF.texto};
    padding: 18px 16px 14px;
    border-radius: 10px;
    margin-bottom: 16px;
    border-bottom: 4px solid ${PDF.acento};
  }
  .cover-brand {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${PDF.acentoClaro};
    margin-bottom: 6px;
  }
  .cover h1 {
    color: ${PDF.texto};
    font-size: 24px;
    margin: 0 0 10px;
    font-weight: 800;
  }
  .cover-sub {
    color: ${PDF.suave};
    font-size: 12px;
    margin: 4px 0;
  }
  .cover-meta {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid ${PDF.borde};
    font-size: 10px;
    color: ${PDF.suave};
  }
  h2 {
    color: ${PDF.fondo};
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-left: 4px solid ${PDF.acento};
    padding: 8px 0 8px 12px;
    margin: 26px 0 14px;
    background: linear-gradient(90deg, rgba(249,115,22,0.12) 0%, transparent 100%);
    page-break-after: avoid;
  }
  h3 {
    font-size: 13px;
    margin: 0 0 10px;
    color: ${PDF.primarioOscuro};
    font-weight: 700;
  }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
  .cell {
    flex: 1 1 46%;
    background: ${PDF.cardBg};
    border: 1px solid ${PDF.borde};
    border-left: 3px solid ${PDF.primario};
    padding: 10px 12px;
    border-radius: 8px;
    min-width: 140px;
  }
  .lbl {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${PDF.suaveOscuro};
    margin-bottom: 4px;
    font-weight: 600;
  }
  .val { font-size: 12px; font-weight: 700; color: ${PDF.textoOscuro}; }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 10px;
    font-size: 10px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid ${PDF.borde};
  }
  th, td { padding: 8px 10px; text-align: left; }
  th {
    background: ${PDF.fondo};
    color: ${PDF.texto};
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.04em;
  }
  tbody tr:nth-child(even) { background: ${PDF.cellBg}; }
  tbody tr:nth-child(odd) { background: ${PDF.cardBg}; }
  tbody td { border-top: 1px solid ${PDF.borde}; color: ${PDF.textoOscuro}; }
  .firmas-page { page-break-inside: avoid; margin-top: 8px; }
  .firmas { display: flex; flex-wrap: wrap; gap: 8px; }
  .firma {
    flex: 1 1 48%;
    border: 1px solid ${PDF.borde};
    border-top: 3px solid ${PDF.acento};
    border-radius: 8px;
    padding: 8px;
    background: ${PDF.cardBg};
    min-height: 100px;
    page-break-inside: avoid;
  }
  .firma-lg { flex: 1 1 48%; min-height: 110px; }
  .firma img {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 72px;
    object-fit: contain;
    background: ${PDF.pageBg};
    border: 1px dashed ${PDF.borde};
    border-radius: 4px;
    margin-top: 4px;
  }
  .firma-lg img { height: 88px; }
  .firma .empty { color: ${PDF.suaveOscuro}; font-style: italic; margin-top: 8px; font-size: 10px; }
  .foto-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .foto-item {
    flex: 1 1 48%;
    max-width: 49%;
    border: 1px solid ${PDF.borde};
    border-radius: 8px;
    overflow: hidden;
    background: ${PDF.cardBg};
    page-break-inside: avoid;
  }
  .foto-thumb {
    display: block;
    width: 100%;
    height: 140px;
    object-fit: cover;
    background: ${PDF.fondo};
  }
  .foto-cap {
    padding: 6px 8px;
    font-size: 9px;
    line-height: 1.35;
    color: ${PDF.textoOscuro};
    background: ${PDF.cellBg};
    border-top: 1px solid ${PDF.borde};
  }
  .foto-cap strong { color: ${PDF.primarioOscuro}; }
  .foto-faltante {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(220,38,38,0.06);
    color: ${PDF.peligro};
    font-size: 9px;
    font-weight: bold;
    text-align: center;
    padding: 8px;
  }
  .meta { margin: 4px 0 0; padding-left: 14px; color: ${PDF.suaveOscuro}; font-size: 9px; }
  .sos {
    background: rgba(220,38,38,0.08);
    border-left: 4px solid ${PDF.peligro};
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    color: ${PDF.textoOscuro};
  }
  .footer {
    margin-top: 36px;
    padding: 16px;
    background: ${PDF.fondo};
    color: ${PDF.suave};
    border-radius: 10px;
    font-size: 9px;
    text-align: center;
  }
  .footer strong { color: ${PDF.acentoClaro}; }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-right: 8px;
  }
  .intro {
    color: ${PDF.suaveOscuro};
    font-size: 11px;
    margin-bottom: 8px;
  }
  p { color: ${PDF.textoOscuro}; }
  `;
}

function firmaBlock(label: string, dataUrl: string | undefined, large = false): string {
  if (!dataUrl) {
    return `<div class="firma ${large ? 'firma-lg' : ''}"><p class="lbl">${esc(label)}</p><p class="empty">Sin firma registrada</p></div>`;
  }
  return `<div class="firma ${large ? 'firma-lg' : ''}"><p class="lbl">${esc(label)}</p><img src="${dataUrl}" alt="${esc(label)}"/></div>`;
}

function operadorVehiculoCells(op: BitacoraFormulario['operador1'] | undefined, prefix: string): string {
  const v = op?.vehiculo;
  if (!op) return '';
  return [
    cell(`${prefix} — Nombre`, op.nombre),
    cell(`${prefix} — Celular`, op.celular),
    cell(`${prefix} — Placas`, v?.placas),
    cell(`${prefix} — Marca`, v?.marca),
    cell(`${prefix} — Modelo`, v?.modelo),
    cell(`${prefix} — Color`, v?.color),
    cell(`${prefix} — No. economico`, v?.numEco),
    cell(`${prefix} — Eco tracto`, v?.ecoTracto),
    cell(`${prefix} — Remolque 1`, v?.placaRemolque1),
    cell(`${prefix} — Remolque 2`, v?.placaRemolque2),
    cell(`${prefix} — Sellos`, v?.sellos),
    cell(`${prefix} — Pedimento`, v?.pedimento),
    cell(`${prefix} — Empresa transporte`, v?.empresaTransporte),
  ].join('');
}

type PreparedEvidencia = AdminEvidenciaRow & { imageDataUri: string | null };

async function prepareEvidencias(
  rows: AdminEvidenciaRow[],
  preloadedUrls?: Record<string, string | null>,
  tempFiles?: string[],
): Promise<PreparedEvidencia[]> {
  const prepared: PreparedEvidencia[] = [];

  for (const ev of rows) {
    try {
      const imageDataUri = await resolveEvidenceImageDataUri(
        ev.url_imagen,
        ev.storage_path,
        preloadedUrls?.[ev.id],
        tempFiles,
      );
      prepared.push({ ...ev, imageDataUri });
    } catch {
      prepared.push({ ...ev, imageDataUri: null });
    }
  }

  return prepared;
}

function buildHtml(params: {
  bitacora: AdminBitacoraDetail;
  evidencias: PreparedEvidencia[];
  sos: AdminSosRow[];
}): string {
  const { bitacora, evidencias, sos } = params;
  const form = (bitacora.formulario ?? {}) as unknown as BitacoraFormulario;
  const sorted = [...evidencias].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const firmaCierreOperador = parseFirmaDataUrl(bitacora.firma_operador);
  const firmaCierreCustodio = parseFirmaDataUrl(bitacora.firma_custodio);

  const resumenRows = sorted
    .map(
      (ev, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td>${esc(new Date(ev.timestamp).toLocaleString())}</td>
        <td>${ev.latitud.toFixed(5)}, ${ev.longitud.toFixed(5)}</td>
        <td>${ev.precision_m ? `±${ev.precision_m} m` : '—'}</td>
        <td>${esc(ev.observaciones?.slice(0, 80))}</td>
        <td>${ev.imageDataUri ? 'Si' : 'No'}</td>
      </tr>`,
    )
    .join('');

  const anexoFotos =
    sorted.length === 0
      ? ''
      : `<div class="foto-grid">${sorted
          .map((ev, i) => {
            const when = new Date(ev.timestamp).toLocaleString();
            const gps = `${ev.latitud.toFixed(5)}, ${ev.longitud.toFixed(5)}`;
            const precision = ev.precision_m ? `±${ev.precision_m} m` : '—';
            const obs = ev.observaciones?.trim()
              ? `<br/><span>${esc(ev.observaciones.slice(0, 60))}${ev.observaciones.length > 60 ? '…' : ''}</span>`
              : '';

            const imgBlock = ev.imageDataUri
              ? `<img class="foto-thumb" src="${ev.imageDataUri}" alt="Reporte ${i + 1}"/>`
              : `<div class="foto-faltante">Sin imagen</div>`;

            return `
        <div class="foto-item">
          ${imgBlock}
          <div class="foto-cap">
            <strong>#${i + 1}</strong> · ${esc(when)}<br/>
            GPS: ${gps} · ${precision}${obs}
          </div>
        </div>`;
          })
          .join('')}</div>`;

  const sosBlocks =
    sos.length === 0
      ? '<p>Sin alertas SOS registradas.</p>'
      : sos
          .map(
            (s) =>
              `<div class="sos"><strong>Estado: ${esc(s.estado)}</strong><br/>${esc(new Date(s.created_at).toLocaleString())}<br/>GPS: ${s.latitud}, ${s.longitud}</div>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>${pdfStyles()}</style>
</head>
<body>
  <div class="cover">
    <div class="cover-brand">Servicons · Custodia y monitoreo</div>
    <h1>Bitacora de custodia</h1>
    <p class="cover-sub">${estadoBadge(bitacora.estado)} ${esc(bitacora.nombre)}</p>
    <p class="cover-sub">${esc(bitacora.ruta)} · Unidad ${esc(bitacora.unidad)}</p>
    <div class="cover-meta">
      Generado: ${new Date().toLocaleString()} · ${sorted.length} reportes GPS · ${sos.length} alertas SOS
      · Custodio: ${esc(bitacora.custodio_nombre)}
    </div>
  </div>

  <h2>1. Datos generales del servicio</h2>
  <div class="grid">
    ${cell('Empresa contratante', bitacora.empresa_contratante)}
    ${cell('Folio cliente', form.folioCliente)}
    ${cell('Nombre servicio', bitacora.nombre)}
    ${cell('Ruta', bitacora.ruta)}
    ${cell('Unidad', bitacora.unidad)}
    ${cell('Custodio', bitacora.custodio_nombre)}
    ${cell('Inicio monitoreo', bitacora.start_time ? new Date(bitacora.start_time).toLocaleString() : bitacora.created_at ? new Date(bitacora.created_at).toLocaleString() : null)}
    ${cell('Cierre', bitacora.completed_at ? new Date(bitacora.completed_at).toLocaleString() : 'En curso')}
    ${cell('Intervalo reportes', bitacora.report_interval_minutes ? `${bitacora.report_interval_minutes} min` : null)}
    ${cell('Total reportes GPS', String(sorted.length))}
  </div>

  <h2>2. Origen y destino</h2>
  <div class="grid">
    ${cell('Origen — Direccion completa', formatUbicacionAddress(form.origen))}
    ${cell('Origen — Calle', form.origen?.calle ? `${form.origen.calle} ${form.origen.numeroExterior ?? ''}`.trim() : null)}
    ${cell('Origen — Colonia', form.origen?.colonia)}
    ${cell('Origen — Codigo postal', form.origen?.codigoPostal)}
    ${cell('Origen — Ciudad', form.origen?.ciudad)}
    ${cell('Origen — Municipio', form.origen?.municipio)}
    ${cell('Origen — Estado', form.origen?.estado)}
    ${cell('Origen — Referencia', form.origen?.referencia)}
    ${cell('Origen — Personal', form.origen?.personalAsignado)}
    ${cell('Origen — GPS', form.origen?.lat && form.origen?.lng ? `${form.origen.lat}, ${form.origen.lng}` : null)}
    ${cell('Destino — Direccion completa', formatUbicacionAddress(form.destino))}
    ${cell('Destino — Calle', form.destino?.calle ? `${form.destino.calle} ${form.destino.numeroExterior ?? ''}`.trim() : null)}
    ${cell('Destino — Colonia', form.destino?.colonia)}
    ${cell('Destino — Codigo postal', form.destino?.codigoPostal)}
    ${cell('Destino — Ciudad', form.destino?.ciudad)}
    ${cell('Destino — Municipio', form.destino?.municipio)}
    ${cell('Destino — Estado', form.destino?.estado)}
    ${cell('Destino — Referencia', form.destino?.referencia)}
    ${cell('Destino — Personal', form.destino?.personalAsignado)}
    ${cell('Destino — GPS', form.destino?.lat && form.destino?.lng ? `${form.destino.lat}, ${form.destino.lng}` : null)}
  </div>

  <h2>3. Tiempos y odometro</h2>
  <div class="grid">
    ${cell('Cita', form.tiempos?.fechaHoraCita)}
    ${cell('Presentacion', form.tiempos?.fechaHoraPresentacion)}
    ${cell('Salida', form.tiempos?.fechaHoraSalida)}
    ${cell('Verificacion', form.tiempos?.fechaHoraVerificacion)}
    ${cell('Llegada', form.tiempos?.fechaHoraLlegada)}
    ${cell('Fin', form.tiempos?.fechaHoraFin)}
    ${cell('Odometro inicial', form.tiempos?.odometroInicial)}
    ${cell('Odometro final', form.tiempos?.odometroFinal)}
    ${cell('Km totales', form.tiempos?.kmTotales)}
    ${cell('Estadia', form.tiempos?.estadia)}
  </div>

  <h2>4. Vehiculo en custodia</h2>
  <div class="grid">
    ${cell('Placas', form.vehiculoCustodia?.placas)}
    ${cell('Color', form.vehiculoCustodia?.color)}
    ${cell('Celular contacto', form.vehiculoCustodia?.celular)}
  </div>

  <h2>5. Operador(es) y vehiculo</h2>
  <div class="grid">
    ${operadorVehiculoCells(form.operador1, 'Operador 1')}
    ${form.operador2 ? operadorVehiculoCells(form.operador2, 'Operador 2') : ''}
  </div>

  ${form.observaciones ? `<h2>6. Observaciones de apertura</h2><p>${esc(form.observaciones)}</p>` : ''}

  <div class="firmas-page">
    <h2>Firmas del servicio</h2>
    <div class="firmas">
      ${firmaBlock(`Origen — ${form.responsableOrigen?.nombre ?? '—'}`, form.responsableOrigen?.firma, true)}
      ${firmaBlock(`Destino — ${form.responsableDestino?.nombre ?? '—'}`, form.responsableDestino?.firma, true)}
      ${firmaBlock(`Operador — ${form.operador1?.nombre ?? '—'}`, form.operador1?.firma, true)}
      ${form.operador2?.firma ? firmaBlock(`Operador 2 — ${form.operador2?.nombre ?? '—'}`, form.operador2.firma, true) : ''}
      ${firmaBlock('Cierre operador', firmaCierreOperador, true)}
      ${firmaBlock(`Cierre custodio — ${bitacora.custodio_nombre ?? '—'}`, firmaCierreCustodio, true)}
    </div>
  </div>

  <h2>Alertas SOS (${sos.length})</h2>
  ${sosBlocks}

  <h2>Resumen de reportes GPS</h2>
  ${
    sorted.length === 0
      ? '<p>Sin reportes registrados.</p>'
      : `<table>
    <thead><tr><th>#</th><th>Fecha</th><th>GPS</th><th>Precision</th><th>Observaciones</th><th>Foto</th></tr></thead>
    <tbody>${resumenRows}</tbody>
  </table>`
  }

  <h2>Evidencias fotograficas (${sorted.length})</h2>
  <p class="intro">Galeria compacta con GPS y hora por reporte. Imagenes embebidas desde almacenamiento.</p>
  ${sorted.length === 0 ? '<p>Sin fotografias.</p>' : anexoFotos}

  <div class="footer">
    <strong>SERVICONS</strong> · Documento confidencial · Uso administrativo<br/>
    ${esc(bitacora.nombre)} · ${sorted.length} evidencias registradas
  </div>
</body>
</html>`;
}

export async function exportBitacoraPdf(params: {
  bitacora: AdminBitacoraDetail;
  evidencias: AdminEvidenciaRow[];
  sos?: AdminSosRow[];
  preloadedImageUrls?: Record<string, string | null>;
}): Promise<{ ok: boolean; error: string | null; uri?: string }> {
  const tempFiles: string[] = [];
  try {
    const prepared = await prepareEvidencias(
      params.evidencias,
      params.preloadedImageUrls,
      tempFiles,
    );
    const html = buildHtml({ ...params, evidencias: prepared, sos: params.sos ?? [] });
    const { uri } = await Print.printToFileAsync({ html });
    await cleanupTempFiles(tempFiles);
    return { ok: true, error: null, uri };
  } catch (e) {
    await cleanupTempFiles(tempFiles);
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo generar el PDF' };
  }
}

export async function shareBitacoraPdf(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Bitacora Servicons PDF',
    });
  }
}
