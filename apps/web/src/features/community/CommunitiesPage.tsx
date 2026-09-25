"use client";

import { Tabs } from "@/components/ui/Tabs";
import { useSignedIn } from "@/features/app/guards";
import { ClubsSection } from "./ClubsSection";
import { EventsSection } from "./EventsSection";
import { PostsSection } from "./PostsSection";
import type { CommunityTab } from "./tabs";

export function CommunitiesPage({ defaultTab }: { defaultTab?: CommunityTab }) {
  const { session, profile } = useSignedIn();
  const uid = session.user.uid;
  const universityId = session.claims.universityId ?? profile.universityId;

  return (
    <Tabs
      label="Topluluk bölümleri"
      lazy
      keepMounted
      defaultTabId={defaultTab}
      items={[
        { id: "gonderiler", label: "Gönderiler", icon: "chat", content: <PostsSection uid={uid} universityId={universityId} /> },
        { id: "kulupler", label: "Kulüpler", icon: "users", content: <ClubsSection uid={uid} universityId={universityId} /> },
        { id: "etkinlikler", label: "Etkinlikler", icon: "calendar", content: <EventsSection uid={uid} universityId={universityId} /> },
      ]}
    />
  );
}
