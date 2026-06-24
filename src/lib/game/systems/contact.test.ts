import { describe, expect, it } from 'vitest';
import { resolveContactEvents } from './contact';

describe('resolveContactEvents', () => {
  it('is a no-op pass (contact damage lives on Attacker)', () => {
    expect(() => resolveContactEvents()).not.toThrow();
  });
});
