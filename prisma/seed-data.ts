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
    assets: undefined as
      | Array<{ s3Key: string; fileName: string; mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' }>
      | undefined,
  },
  {
    elementIndex: 1, // MARCUS
    mediaType: 'IMAGE' as const,
    description: 'Marcus costume reference photos — multiple angles',
    externalUrl: undefined as string | undefined,
    assets: [
      { s3Key: 'demo/marcus-front.jpg', fileName: 'marcus-front.jpg', mediaType: 'IMAGE' as const },
      { s3Key: 'demo/marcus-side.jpg', fileName: 'marcus-side.jpg', mediaType: 'IMAGE' as const },
      { s3Key: 'demo/marcus-back.jpg', fileName: 'marcus-back.jpg', mediaType: 'IMAGE' as const },
    ],
  },
  {
    elementIndex: 2, // THE MIDNIGHT GARDEN
    mediaType: 'LINK' as const,
    description: 'Garden location inspiration — overgrown Victorian garden at night',
    externalUrl: 'https://example.com/garden-ref',
    assets: undefined as
      | Array<{ s3Key: string; fileName: string; mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' }>
      | undefined,
  },
];
