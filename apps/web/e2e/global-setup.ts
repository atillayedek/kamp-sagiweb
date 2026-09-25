export default async function globalSetup() {
  const seed = await import("../../../scripts/seed-emulator.mjs");
  try {
    await seed.resetEmulators();
    await seed.seedUniversities();
  } catch (error) {
    throw new Error(`Emulator'ler çalışmıyor olabilir. E2E testlerini kökten \`pnpm test:e2e\` ile çalıştır.\n${String(error)}`);
  }
}
