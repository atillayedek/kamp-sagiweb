import type { AnalyticsConnector } from "./types";

export const noopAnalytics: AnalyticsConnector = {
  track: () => undefined,
};
