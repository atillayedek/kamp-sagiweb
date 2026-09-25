export const COMMUNITY_TABS = ["gonderiler", "kulupler", "etkinlikler"] as const;

export type CommunityTab = (typeof COMMUNITY_TABS)[number];

export function communityTabFrom(value: string | string[] | undefined): CommunityTab | undefined {
  return COMMUNITY_TABS.find((tab) => tab === value);
}
