export const DEMO_USERS = [
  {
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    password: 'director123',
    role: 'DECIDER' as const,
    title: 'Director',
  },
  {
    name: 'Mike Rodriguez',
    email: 'mike@example.com',
    password: 'producer123',
    role: 'ADMIN' as const,
    title: 'Producer',
  },
  {
    name: 'Alex Kim',
    email: 'alex@example.com',
    password: 'crewmember123',
    role: 'MEMBER' as const,
    title: 'Props Master',
  },
] as const;

export const DEMO_PRODUCTION = {
  title: 'The Midnight Garden',
  description: 'A mysterious garden that only appears at midnight, where lost memories take physical form.',
} as const;

export const DEMO_ELEMENTS = [
  {
    name: 'ELENA',
    type: 'CHARACTER' as const,
    highlightPage: 1,
    highlightText: 'ELENA',
  },
  {
    name: 'MARCUS',
    type: 'CHARACTER' as const,
    highlightPage: 2,
    highlightText: 'MARCUS',
  },
  {
    name: 'THE MIDNIGHT GARDEN',
    type: 'LOCATION' as const,
    highlightPage: 1,
    highlightText: 'THE MIDNIGHT GARDEN',
  },
  {
    name: 'Memory Lantern',
    type: 'OTHER' as const,
    highlightPage: 3,
    highlightText: 'memory lantern',
  },
  {
    name: 'Garden Gate Key',
    type: 'OTHER' as const,
    highlightPage: 4,
    highlightText: 'garden gate key',
  },
] as const;

export const DEMO_OPTIONS = [
  {
    elementIndex: 0, // ELENA
    mediaType: 'LINK' as const,
    description: 'Elena character reference — young woman in her 30s, determined expression',
    externalUrl: 'https://example.com/elena-ref',
  },
  {
    elementIndex: 1, // MARCUS
    mediaType: 'LINK' as const,
    description: 'Marcus character reference — older gentleman, wise appearance',
    externalUrl: 'https://example.com/marcus-ref',
  },
  {
    elementIndex: 2, // THE MIDNIGHT GARDEN
    mediaType: 'LINK' as const,
    description: 'Garden location inspiration — overgrown Victorian garden at night',
    externalUrl: 'https://example.com/garden-ref',
  },
] as const;
