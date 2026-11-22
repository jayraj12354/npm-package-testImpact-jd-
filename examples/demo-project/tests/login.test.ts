import { describe, it, expect } from 'vitest';
import { authenticate } from '../src/auth/loginService.js';

describe('loginService', () => {
  it('authenticates with valid token', () => {
    const res = authenticate('1', 'secret-token');
    expect(res.success).toBe(true);
    expect(res.user?.name).toBe('Alice');
  });

  it('rejects invalid token', () => {
    const res = authenticate('1', 'wrong');
    expect(res.success).toBe(false);
  });
});
