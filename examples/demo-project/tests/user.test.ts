import { describe, it, expect } from 'vitest';
import { getUserById } from '../src/services/userService.js';

describe('userService', () => {
  it('returns user by id', () => {
    const user = getUserById('1');
    expect(user.name).toBe('Alice');
    expect(user.role).toBe('admin');
  });
});
