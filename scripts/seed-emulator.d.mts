export function resetEmulators(): Promise<void>;
export function seedUniversities(): Promise<number>;
export function createUser(input: { email: string; password: string; claims?: Record<string, unknown> }): Promise<string>;
