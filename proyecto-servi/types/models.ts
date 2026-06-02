export interface Ubicacion {
  estado: string;
  municipio: string;
  ciudad?: string;
  colonia?: string;
  calle?: string;
  numeroExterior?: string;
  codigoPostal?: string;
  referencia?: string;
  personalAsignado: string;
  lat?: string;
  lng?: string;
}

export interface VehiculoCustodia {
  placas: string;
  color: string;
  celular: string;
}

export interface Tiempos {
  fechaHoraCita: string;
  fechaHoraPresentacion?: string;
  odometroInicial: string;
  fechaHoraSalida?: string;
  fechaHoraVerificacion?: string;
  fechaHoraLlegada?: string;
  fechaHoraFin?: string;
  odometroFinal?: string;
  kmTotales?: string;
  estadia?: string;
}

export interface Responsable {
  nombre: string;
  firma: string;
}

export interface VehiculoOperador {
  modelo: string;
  color: string;
  placas: string;
  marca: string;
  placaRemolque1: string;
  numEco: string;
  sellos: string;
  ecoTracto: string;
  pedimento: string;
  placaRemolque2: string;
  empresaTransporte: string;
}

export interface OperadorCustodiado {
  nombre: string;
  firma: string;
  celular: string;
  vehiculo: VehiculoOperador;
}

export interface Firma {
  format: 'data-url';
  mime: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  encoding: 'base64';
  capturedAt: string;
  signerRole: 'custodio' | 'operador' | 'responsable_origen' | 'responsable_destino';
  signerName: string;
  data: string;
}

export interface BitacoraFormulario {
  id: string;
  nombre: string;
  empresaContratante: string;
  folioCliente: string;
  origen: Ubicacion;
  destino: Ubicacion;
  vehiculoCustodia: VehiculoCustodia;
  tiempos: Tiempos;
  responsableOrigen: Responsable;
  responsableDestino: Responsable;
  operador1: OperadorCustodiado;
  operador2?: OperadorCustodiado;
  observaciones: string;
  reportIntervalMinutes?: number;
  whatsappGrupo?: { remoteJid: string; pushName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BitacoraResumen {
  id: string;
  nombre: string | null;
  ruta: string | null;
  unidad: string | null;
  empresa_contratante: string | null;
  estado: 'pendiente' | 'activo' | 'completado' | 'cancelado';
  created_at: string;
  completed_at?: string | null;
  custodio_id: string;
  report_interval_minutes?: number;
}

export interface Evidencia {
  id: string;
  bitacora_id: string;
  custodio_id: string;
  url_imagen: string;
  latitud: number;
  longitud: number;
  observaciones?: string;
  timestamp: string;
}

export interface SosAlert {
  id: string;
  custodio_id: string;
  bitacora_id?: string;
  latitud: number;
  longitud: number;
  estado: 'activa' | 'atendida' | 'falsa_alarma';
  created_at: string;
}

export type UserRole = 'super_usuario' | 'jefe_custodios' | 'custodio' | 'cliente';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string | null;
  celular: string | null;
  role: UserRole;
  empresa: string | null;
  activo: boolean;
  created_at: string;
}
