"use client";

import { needSchema, savedNeedSchema } from "@kampusagi/contracts";
import { useMemo } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { useSignedIn } from "@/features/app/guards";
import { ForYou } from "./ForYou";
import { NeedMarksProvider, useNeedMarks } from "./marks";
import { NeedFeed, type NeedLoader } from "./NeedFeed";

const PAGE_SIZE = 20;

export function DiscoverPage() {
  const { session } = useSignedIn();
  return (
    <NeedMarksProvider uid={session.user.uid}>
      <DiscoverContent />
    </NeedMarksProvider>
  );
}

function DiscoverContent() {
  const { documents } = useConnectors();
  const { session, profile } = useSignedIn();
  const marks = useNeedMarks();
  const uid = session.user.uid;
  const universityId = session.claims.universityId ?? profile.universityId;

  const loaders = useMemo<Record<"campus" | "global" | "saved", NeedLoader>>(
    () => ({
      campus: (after) =>
        documents.queryPage(
          "needs",
          { where: [["universityId", "==", universityId], ["status", "==", "open"]], orderBy: ["createdAt", "desc"], limit: PAGE_SIZE, after },
          needSchema,
        ),
      global: (after) =>
        documents.queryPage(
          "needs",
          { where: [["visibility", "==", "global"], ["status", "==", "open"]], orderBy: ["createdAt", "desc"], limit: PAGE_SIZE, after },
          needSchema,
        ),
      saved: async (after) => {
        const page = await documents.queryPage(
          `savedNeeds/${uid}/items`,
          { orderBy: ["createdAt", "desc"], limit: PAGE_SIZE, after },
          savedNeedSchema,
        );
        const needs = await Promise.allSettled(page.items.map((item) => documents.getDocument(`needs/${item.data.needId}`, needSchema)));
        const items = page.items.flatMap((item, index) => {
          const result = needs[index]!;
          return result.status === "fulfilled" && result.value ? [{ id: item.data.needId, data: result.value }] : [];
        });
        return { items, next: page.next };
      },
    }),
    [documents, uid, universityId],
  );

  const emptyCampus = { title: "Kampüsünde henüz açık ilan yok", description: "İlk ilanı sen yazabilirsin." };
  const emptyGlobal = { title: "Henüz tüm üniversitelere açık ilan yok", description: "Genel görünürlüklü ilanlar burada listelenir." };
  const emptySaved = { title: "Kaydettiğin ilan yok", description: "İlanlardaki “Kaydet” şeridiyle buraya ekleyebilirsin." };

  return (
    <div className="flex flex-col gap-8">
      <Card as="section" aria-labelledby="need-cta" className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 id="need-cta" className="text-lg font-semibold text-ink">
            Bir ihtiyacın mı var?
          </h2>
          <p className="text-ink-muted">Birkaç cümleyle anlat; ilanını senin için hazırlayalım.</p>
        </div>
        <ButtonLink href="/kesfet/yeni">İhtiyacını yaz</ButtonLink>
      </Card>
      <section aria-labelledby="for-you" className="flex flex-col gap-3">
        <h2 id="for-you" className="text-xl font-bold text-ink">
          Sana uygun ilanlar
        </h2>
        <ForYou uid={uid} universityId={universityId} />
      </section>
      <section aria-labelledby="feed" className="flex flex-col gap-3">
        <h2 id="feed" className="text-xl font-bold text-ink">
          İlanlar
        </h2>
        <Tabs
          label="İlan akışı"
          lazy
          items={[
            {
              id: "kampus",
              label: "Kampüsüm",
              content: <NeedFeed load={loaders.campus} uid={uid} universityId={universityId} empty={emptyCampus} />,
            },
            {
              id: "genel",
              label: "Tüm üniversiteler",
              content: <NeedFeed load={loaders.global} uid={uid} universityId={universityId} empty={emptyGlobal} />,
            },
            {
              id: "kaydedilenler",
              label: "Kaydettiklerim",
              content: (
                <NeedFeed
                  load={loaders.saved}
                  uid={uid}
                  universityId={universityId}
                  empty={emptySaved}
                  hide={(id) => marks.get(id)?.saved === false}
                />
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
