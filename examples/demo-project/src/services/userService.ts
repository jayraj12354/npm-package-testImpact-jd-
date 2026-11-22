// updated user service
export interface User { id: string; name: string; role: 'admin' | 'user'; }
export function getUserById(id: string): User { return { id, name: 'Alice Smith', role: 'admin' }; }
