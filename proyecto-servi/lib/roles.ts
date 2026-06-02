import type { UserRole } from '../types/models';

/** Master Seccion 1: la app operativa es solo custodio -> home */
export const CUSTODIO_HOME_ROUTE = '/(app)/home';

export const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'super_usuario',
    label: 'Super usuario',
    description: 'Acceso total. Crea jefes, custodios y clientes.',
  },
  {
    value: 'jefe_custodios',
    label: 'Admin',
    description: 'Supervisa operaciones y gestiona custodias.',
  },
  {
    value: 'custodio',
    label: 'Custodio',
    description: 'Opera servicios en campo.',
  },
  {
    value: 'cliente',
    label: 'Cliente',
    description: 'Consulta bitacoras de su empresa.',
  },
];

export function getRoleLabel(role: UserRole | null | undefined): string {
  return ROLES.find((r) => r.value === role)?.label ?? 'Usuario';
}

export function getHomeRouteForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'super_usuario':
    case 'jefe_custodios':
      return '/(app)/admin/home';
    case 'custodio':
      return CUSTODIO_HOME_ROUTE;
    case 'cliente':
      return '/(app)/cliente/home';
    default:
      return '/auth/login';
  }
}

/** Texto visible al registrarse: que pantalla abrira segun el rol */
export function getRoleDestinationHint(role: UserRole): string {
  switch (role) {
    case 'super_usuario':
      return 'Panel de control — administracion total';
    case 'jefe_custodios':
      return 'Supervision de custodias — panel admin';
    case 'custodio':
      return 'Mis servicios — operacion en campo';
    case 'cliente':
      return 'Portal del cliente — consulta de bitacoras';
    default:
      return 'Pantalla segun tu rol';
  }
}

export function isRouteAllowedForRole(
  role: UserRole | null | undefined,
  routePath: string,
): boolean {
  if (!role) return false;

  if (routePath.includes('privacidad')) {
    return true;
  }

  if (role === 'super_usuario' || role === 'jefe_custodios') {
    return routePath.includes('admin');
  }

  if (role === 'custodio') {
    return !routePath.includes('admin') && !routePath.includes('cliente');
  }

  if (role === 'cliente') {
    return routePath.includes('cliente');
  }

  return false;
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'super_usuario' || role === 'jefe_custodios';
}

export function getCreatableRoles(actorRole: UserRole | null | undefined): UserRole[] {
  if (actorRole === 'super_usuario') {
    return ['super_usuario', 'custodio', 'jefe_custodios', 'cliente'];
  }
  if (actorRole === 'jefe_custodios') {
    return ['custodio', 'cliente'];
  }
  return [];
}

export function canCreateBitacora(role: UserRole | null | undefined): boolean {
  return role === 'custodio';
}

export function canManageTrash(role: UserRole | null | undefined): boolean {
  return role === 'super_usuario';
}

export function getDashboardTitleForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'super_usuario':
      return 'Panel de control';
    case 'jefe_custodios':
      return 'Supervision de custodias';
    case 'custodio':
      return 'Mis servicios';
    case 'cliente':
      return 'Portal del cliente';
    default:
      return 'Servicons';
  }
}

export function getRoleScreenLabel(role: UserRole | null | undefined): string {
  return getRoleLabel(role);
}

export function getCreatableRoleOptions(actorRole: UserRole | null | undefined) {
  const allowed = getCreatableRoles(actorRole);
  return ROLES.filter((r) => allowed.includes(r.value));
}

