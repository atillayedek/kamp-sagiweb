"use client";

import { COMMUNITY_LIMITS, postSchema, postTextSchema, type Post, type Visibility } from "@kampusagi/contracts";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Tabs } from "@/components/ui/Tabs";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { serverTime, type QueryOptions } from "@/connectors/types";
import { AuthorCache, type AuthorView } from "@/features/discover/authors";
import { visibilityLabels } from "@/features/needs/labels";
import { useFocusRequest } from "./focus";
import { PagedList, type PageLoader } from "./PagedList";
import { PostCard } from "./PostCard";

const PAGE_SIZE = 20;

const visibilityOptions = (["campus", "global"] as const).map((value) => ({
  value,
  label: visibilityLabels[value].title,
  description: visibilityLabels[value].description,
}));

type FeedPost = { post: Post; author: AuthorView };

type PostsSectionProps = { uid: string; universityId: string };

export function PostsSection({ uid, universityId }: PostsSectionProps) {
  const { documents } = useConnectors();
  const [version, setVersion] = useState(0);
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(new Set());
  const [feedHeading, focusFeedHeading] = useFocusRequest<HTMLHeadingElement>();
  const loaders = useMemo(() => {
    // Yazarlar iki akış boyunca önbellekte tutulur.
    const authors = new AuthorCache(documents, universityId);
    const loader =
      (where: QueryOptions["where"]): PageLoader<FeedPost> =>
      async (after) => {
        const page = await documents.queryPage("posts", { where, orderBy: ["createdAt", "desc"], limit: PAGE_SIZE, after }, postSchema);
        const known = await authors.resolve(
          page.items.map((item) => ({ uid: item.data.authorUid, universityId: item.data.universityId })),
        );
        return {
          items: page.items.map((item) => ({ id: item.id, data: { post: item.data, author: known.get(item.data.authorUid)! } })),
          next: page.next,
        };
      };
    return { campus: loader([["universityId", "==", universityId]]), global: loader([["visibility", "==", "global"]]) };
  }, [documents, universityId]);

  const renderPost = useCallback(
    (item: { id: string; data: FeedPost }) => (
      <PostCard
        id={item.id}
        post={item.data.post}
        author={item.data.author}
        uid={uid}
        onDeleted={() => {
          setDeleted((current) => new Set(current).add(item.id));
          focusFeedHeading();
        }}
      />
    ),
    [focusFeedHeading, uid],
  );

  const feed = (load: PageLoader<FeedPost>, empty: { title: string; description: string }) => (
    <PagedList
      load={load}
      renderItem={renderPost}
      label="Gönderiler"
      noun="gönderi"
      empty={{ ...empty, icon: "chat" }}
      errorTitle="Gönderiler yüklenemedi"
      hide={(id) => deleted.has(id)}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <PostComposer uid={uid} universityId={universityId} onPosted={() => setVersion((current) => current + 1)} />
      <section aria-labelledby="post-feed" className="flex flex-col gap-3">
        <h2 id="post-feed" ref={feedHeading} tabIndex={-1} className="text-xl font-bold text-ink">
          Gönderiler
        </h2>
        <Tabs
          key={version}
          label="Gönderi akışı"
          lazy
          keepMounted
          items={[
            {
              id: "kampus",
              label: "Kampüsüm",
              content: feed(loaders.campus, { title: "Kampüsünde henüz gönderi yok", description: "İlk gönderiyi sen paylaşabilirsin." }),
            },
            {
              id: "genel",
              label: "Tüm üniversiteler",
              content: feed(loaders.global, {
                title: "Henüz tüm üniversitelere açık gönderi yok",
                description: "Genel görünürlüklü gönderiler burada listelenir.",
              }),
            },
          ]}
        />
      </section>
    </div>
  );
}

function PostComposer({ uid, universityId, onPosted }: { uid: string; universityId: string; onPosted: () => void }) {
  const { writer } = useConnectors();
  const toast = useToast();
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("campus");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = postTextSchema.safeParse(text);
    if (!parsed.success) {
      setError(`Gönderi 1–${COMMUNITY_LIMITS.post.max} karakter olmalı.`);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await writer.createDocument("posts", {
        authorUid: uid,
        universityId,
        visibility,
        text: parsed.data,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTime,
      });
      toast.show({ title: "Gönderin paylaşıldı", tone: "success" });
      setText("");
      onPosted();
    } catch (caught) {
      setError(toAppError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="post-composer" className="p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <h2 id="post-composer" className="text-lg font-semibold text-ink">
          Yeni gönderi
        </h2>
        <TextArea
          label="Ne paylaşmak istersin?"
          hint="Kişisel bilgi (telefon, e-posta, kimlik numarası) paylaşma. Gönderiler sonradan düzenlenemez."
          value={text}
          maxLength={COMMUNITY_LIMITS.post.max}
          rows={3}
          required
          error={error}
          onChange={(event) => setText(event.target.value)}
        />
        <RadioGroup legend="Kimler görsün?" value={visibility} options={visibilityOptions} onChange={setVisibility} />
        <div>
          <Button type="submit" aria-disabled={busy || undefined}>
            {busy ? "Paylaşılıyor…" : "Paylaş"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
