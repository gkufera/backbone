import { describe, it, expect } from 'vitest';
import { DEMO_USERS, DEMO_PRODUCTION, DEMO_ELEMENTS } from '../../../prisma/seed-data';

describe('Seed Data', () => {
  it('demo data has 3 users with required fields', () => {
    expect(DEMO_USERS).toHaveLength(3);

    for (const user of DEMO_USERS) {
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('role');
      expect(user.name.length).toBeGreaterThan(0);
      expect(user.email).toMatch(/@/);
    }

    const roles = DEMO_USERS.map((u) => u.role);
    expect(roles).toContain('DECIDER');
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('MEMBER');
  });

  it('demo elements have valid types', () => {
    expect(DEMO_ELEMENTS.length).toBe(5);

    const validTypes = ['CHARACTER', 'LOCATION', 'OTHER'];
    for (const element of DEMO_ELEMENTS) {
      expect(element).toHaveProperty('name');
      expect(element).toHaveProperty('type');
      expect(validTypes).toContain(element.type);
    }

    const types = DEMO_ELEMENTS.map((e) => e.type);
    expect(types.filter((t) => t === 'CHARACTER')).toHaveLength(2);
    expect(types.filter((t) => t === 'LOCATION')).toHaveLength(1);
  });
});
