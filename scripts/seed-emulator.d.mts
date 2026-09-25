export function resetEmulators(): Promise<void>;
export function seedUniversities(): Promise<number>;
export function createUser(input: { email: string; password: string; claims?: Record<string, unknown> }): Promise<string>;
export function writeDocument(path: string, data: Record<string, unknown>): Promise<void>;
export function createVerifiedStudent(input: {
  email: string;
  password: string;
  displayName: string;
  universityId?: string;
  department?: string;
  interests?: string[];
  skills?: string[];
}): Promise<string>;
