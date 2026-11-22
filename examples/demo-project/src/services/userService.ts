export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

export function getUserById(id: string): User {
  return {
    id,
    name: 'Alice',
    role: id === '1' ? 'admin' : 'user',
  };
}
