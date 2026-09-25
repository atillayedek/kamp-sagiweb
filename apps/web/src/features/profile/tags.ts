export function parseTagInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLocaleLowerCase("tr-TR"))
        .filter(Boolean),
    ),
  ];
}

export function formatTagInput(tags: readonly string[]): string {
  return tags.join(", ");
}
