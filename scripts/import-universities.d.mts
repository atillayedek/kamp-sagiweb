export function toTitleCase(value: string): string;
export function universityId(name: string): string;
export function convert(source: Array<{ province: string; universities: Array<{ name: string }> }>): {
  universities: Record<string, { name: string; city: string }>;
  warnings: string[];
};
