export const PRIVACY_POLICY_VERSION = '2025-06-01';

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: '1. Datos que recopilamos',
    body:
      'Servicons Mobile recopila nombre, correo electronico, rol de usuario, empresa (clientes), ubicacion GPS en tiempo real durante servicios activos, fotografias de evidencia georreferenciadas, firmas digitales y registros de alertas SOS.',
  },
  {
    title: '2. Uso de ubicacion y camara',
    body:
      'La ubicacion y la camara se utilizan exclusivamente para el monitoreo de custodias: reportes periodicos, evidencias fotograficas y emergencias. No vendemos ni compartimos estos datos con terceros ajenos al servicio contratado.',
  },
  {
    title: '3. Almacenamiento y seguridad',
    body:
      'Los datos se almacenan en Supabase con cifrado en transito (HTTPS). Las evidencias se guardan en almacenamiento seguro. Solo usuarios autorizados (custodio, administradores y clientes de la misma empresa) pueden consultar la informacion segun su rol.',
  },
  {
    title: '4. Comparticion con terceros',
    body:
      'Podemos enviar notificaciones via n8n/WhatsApp cuando el custodio inicia un servicio, reporta evidencia o activa SOS, unicamente con los contactos configurados en la bitacora.',
  },
  {
    title: '5. Retencion y derechos',
    body:
      'Conservamos bitacoras y evidencias mientras el servicio este activo y despues segun la politica de la empresa contratante. Puedes solicitar correccion de tu perfil o desactivacion de cuenta contactando al administrador de Servicons.',
  },
  {
    title: '6. Aceptacion',
    body:
      'Al usar Servicons Mobile aceptas esta politica de privacidad y el tratamiento de datos descrito. Si no estas de acuerdo, no debes utilizar la aplicacion.',
  },
];

export const PRIVACY_POLICY_FULL_TEXT = PRIVACY_POLICY_SECTIONS.map(
  (s) => `${s.title}\n\n${s.body}`,
).join('\n\n');
