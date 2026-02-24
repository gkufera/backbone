export const DEPARTMENT_NAME_MAX_LENGTH = 100;

export const DEFAULT_DEPARTMENTS = [
  'Cast',
  'Costume',
  'Props',
  'Set Design',
  'Locations',
  'Hair & Makeup',
  'VFX',
  'Sound',
  'Production Design',
] as const;

export const ELEMENT_TYPE_DEPARTMENT_MAP: Record<string, string> = {
  CHARACTER: 'Cast',
  LOCATION: 'Locations',
};
