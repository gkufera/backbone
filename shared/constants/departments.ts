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
  'Storyboard Artist',
  'AD',
  'Cinematographer',
  'Stunt Coordinator',
] as const;

export const DEFAULT_DEPARTMENT_COLORS: Record<string, string> = {
  Cast: '#E63946',
  Costume: '#457B9D',
  Props: '#2A9D8F',
  'Set Design': '#E9C46A',
  Locations: '#264653',
  'Hair & Makeup': '#F4A261',
  VFX: '#7209B7',
  Sound: '#06D6A0',
  'Production Design': '#118AB2',
  'Storyboard Artist': '#073B4C',
  AD: '#EF476F',
  Cinematographer: '#FFD166',
  'Stunt Coordinator': '#F77F00',
};

export const ELEMENT_TYPE_DEPARTMENT_MAP: Record<string, string> = {
  CHARACTER: 'Cast',
  LOCATION: 'Locations',
};
