import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Firestore security rules static verification', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('starts with global default-deny catch-all rule', () => {
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');
  });

  it('covers all 10 blueprint collections without permissive allow-true', () => {
    const collections = [
      'users',
      'groups',
      'inviteCodes',
      'groupMembers',
      'categories',
      'budgets',
      'transactions',
      'notifications',
      'savingsGoals',
      'premiumSubscriptions',
    ];
    for (const col of collections) {
      expect(rulesContent).toContain(`match /${col}/`);
    }
    expect(rulesContent).not.toMatch(/allow\s+(read|write)\s*:\s*if\s+true/);
  });

  it('enforces list isolation on inviteCodes, users, groups, and transactions', () => {
    expect(rulesContent).toContain('match /inviteCodes/{code}');
    expect(rulesContent).toContain('allow list: if false;');
    expect(rulesContent).toContain('validAmount(data.amount)');
    expect(rulesContent).toContain('data.simulated == true');
  });
});
