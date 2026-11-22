import { getUserById, type User } from '../services/userService.js';

export function authenticate(id: string, token: string): { success: boolean; user?: User } {
  if (token === 'secret-token') {
    return { success: true, user: getUserById(id) };
  }
  return { success: false };
}
