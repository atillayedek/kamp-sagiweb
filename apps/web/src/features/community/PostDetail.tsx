"use client";

import {
  COMMUNITY_LIMITS,
  commentSchema,
  commentTextSchema,
  documentIdSchema,
  postSchema,
  type Comment,
} from "@kampusagi/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { serverTime, type ListedDocument } from "@/connectors/types";
import { useSignedIn } from "@/features/app/guards";
import { useDocumentOnce } from "@/features/data/useDocument";
import { AuthorCache, loadAuthors, UNKNOWN_AUTHOR, type AuthorView } from "@/features/discover/authors";
import { formatDateTime } from "@/lib/date";
import { useFocusRequest } from "./focus";
import { PagedList, type PageLoader } from "./PagedList";
import { PostCard } from "./PostCard";
import { ReportButton } from "./ReportButton";

const PAGE_SIZE = 20;

type FeedComment = { comment: Comment; author: AuthorView };

function NotFound() {
  return (
    <EmptyState
      icon="chat"
      title="Gönderi bulunamadı"
      description="Gönderi silinmiş olabilir ya da görme iznin yok."
      action={<ButtonLink href="/topluluklar">Topluluklar&apos;a dön</ButtonLink>}
    />
  );
}

export function PostDetail({ postId }: { postId: string }) {
  const validId = documentIdSchema.safeParse(postId).success;
  const post = useDocumentOnce(validId ? `posts/${postId}` : null, postSchema);
  const { documents } = useConnectors();
  const { session, profile } = useSignedIn();
  const router = useRouter();
  const uid = session.user.uid;
  const universityId = session.claims.universityId ?? profile.universityId;
  const [author, setAuthor] = useState<AuthorView | null>(null);
  const [commentDelta, setCommentDelta] = useState(0);
  const [added, setAdded] = useState<Array<ListedDocument<FeedComment>>>([]);
  const [commentsHeading, focusComments] = useFocusRequest<HTMLHeadingElement>();
  const self: AuthorView = { name: profile.displayName, department: profile.department, verified: true };

  const postData = post.status === "ready" ? post.data : null;
  useEffect(() => {
    if (!postData) return;
    let active = true;
    void loadAuthors(documents, [{ uid: postData.authorUid, universityId: postData.universityId }], universityId).then((authors) => {
      if (active) setAuthor(authors.get(postData.authorUid) ?? UNKNOWN_AUTHOR);
    });
    return () => {
      active = false;
    };
  }, [documents, postData, universityId]);

  if (!validId || post.status === "missing") return <NotFound />;
  if (post.status === "error") {
    return post.error.code === "permission-denied" ? (
      <NotFound />
    ) : (
      <ErrorState title="Gönderi yüklenemedi" description={post.error.message} />
    );
  }
  if (post.status === "loading" || !author) {
    return (
      <LoadingRegion label="Gönderi yükleniyor…">
        <Card className="flex flex-col gap-3 p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      </LoadingRegion>
    );
  }

  const postAuthorUid = post.data.authorUid;
  return (
    <div className="flex flex-col gap-8">
      <PostCard
        id={postId}
        post={post.data}
        author={author}
        uid={uid}
        showCommentsLink={false}
        commentDelta={commentDelta}
        onDeleted={() => router.push("/topluluklar")}
      />
      <section aria-labelledby="comments" className="flex flex-col gap-4">
        <h2 id="comments" ref={commentsHeading} tabIndex={-1} className="text-xl font-bold text-ink">
          Yorumlar
        </h2>
        <CommentComposer
          postId={postId}
          uid={uid}
          universityId={universityId}
          onPosted={(id, comment) => {
            setCommentDelta((current) => current + 1);
            setAdded((current) => [...current, { id, data: { comment, author: self } }]);
          }}
        />
        <CommentList
          postId={postId}
          postAuthorUid={postAuthorUid}
          uid={uid}
          universityId={universityId}
          added={added}
          onDeleted={() => {
            setCommentDelta((current) => current - 1);
            focusComments();
          }}
        />
      </section>
    </div>
  );
}

function CommentList({
  postId,
  postAuthorUid,
  uid,
  universityId,
  added,
  onDeleted,
}: {
  postId: string;
  postAuthorUid: string;
  uid: string;
  universityId: string;
  added: Array<ListedDocument<FeedComment>>;
  onDeleted: () => void;
}) {
  const { documents } = useConnectors();
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(new Set());
  const load = useMemo<PageLoader<FeedComment>>(() => {
    const authors = new AuthorCache(documents, universityId);
    return async (after) => {
      const page = await documents.queryPage(
        `posts/${postId}/comments`,
        { orderBy: ["createdAt", "asc"], limit: PAGE_SIZE, after },
        commentSchema,
      );
      const known = await authors.resolve(
        page.items.map((item) => ({ uid: item.data.authorUid, universityId: item.data.authorUniversityId })),
      );
      return {
        items: page.items.map((item) => ({ id: item.id, data: { comment: item.data, author: known.get(item.data.authorUid)! } })),
        next: page.next,
      };
    };
  }, [documents, postId, universityId]);

  const renderComment = useCallback(
    (item: { id: string; data: FeedComment }) => (
      <CommentItem
        postId={postId}
        commentId={item.id}
        comment={item.data.comment}
        author={item.data.author}
        canDelete={item.data.comment.authorUid === uid || postAuthorUid === uid}
        own={item.data.comment.authorUid === uid}
        onDeleted={() => {
          setDeleted((current) => new Set(current).add(item.id));
          onDeleted();
        }}
      />
    ),
    [onDeleted, postAuthorUid, postId, uid],
  );

  return (
    <PagedList
      load={load}
      renderItem={renderComment}
      label="Yorumlar"
      noun="yorum"
      empty={{ title: "Henüz yorum yok", description: "İlk yorumu sen yazabilirsin.", icon: "chat" }}
      errorTitle="Yorumlar yüklenemedi"
      hide={(id) => deleted.has(id)}
      trailing={added}
    />
  );
}

function CommentItem({
  postId,
  commentId,
  comment,
  author,
  canDelete,
  own,
  onDeleted,
}: {
  postId: string;
  commentId: string;
  comment: Comment;
  author: AuthorView;
  canDelete: boolean;
  own: boolean;
  onDeleted: () => void;
}) {
  const { functions } = useConnectors();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await functions.call("deleteComment", { postId, commentId });
      toast.show({ title: "Yorum silindi", tone: "success" });
      onDeleted();
    } catch (error) {
      toast.show({ title: "Yorum silinemedi", description: toAppError(error).message, tone: "danger" });
      setBusy(false);
    }
  }

  return (
    <article aria-label={`${author.name} yorumu`} className="flex gap-3 rounded-card border border-line bg-surface p-4">
      <Avatar name={author.name} size="sm" decorative />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm">
          <span className="font-semibold text-ink">{author.name}</span>{" "}
          <span className="text-ink-muted">· {formatDateTime(comment.createdAt)}</span>
        </p>
        <p className="whitespace-pre-line break-words text-ink">{comment.text}</p>
        <div className="-ml-3 flex flex-wrap items-center">
          {canDelete && (
            <Button
              variant="ghost"
              className="min-h-11 px-3 text-sm text-danger"
              aria-disabled={busy || undefined}
              aria-label={`${busy ? "Siliniyor" : "Sil"}: ${own ? "yorumun" : `${author.name} yorumu`}`}
              onClick={remove}
            >
              <Icon name="trash" className="size-4.5" />
              {busy ? "Siliniyor…" : "Sil"}
            </Button>
          )}
          {!own && (
            <ReportButton compact target={{ type: "comment", postId, commentId }} subject={`${author.name} yorumu`} />
          )}
        </div>
      </div>
    </article>
  );
}

function CommentComposer({
  postId,
  uid,
  universityId,
  onPosted,
}: {
  postId: string;
  uid: string;
  universityId: string;
  onPosted: (id: string, comment: Comment) => void;
}) {
  const { writer } = useConnectors();
  const toast = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = commentTextSchema.safeParse(text);
    if (!parsed.success) {
      setError(`Yorum 1–${COMMUNITY_LIMITS.comment.max} karakter olmalı.`);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const id = await writer.createDocument(`posts/${postId}/comments`, {
        authorUid: uid,
        authorUniversityId: universityId,
        text: parsed.data,
        createdAt: serverTime,
      });
      toast.show({ title: "Yorumun eklendi", tone: "success" });
      setText("");
      onPosted(id, { authorUid: uid, authorUniversityId: universityId, text: parsed.data, createdAt: new Date().toISOString() });
    } catch (caught) {
      setError(toAppError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <TextArea
        label="Yorum yaz"
        value={text}
        maxLength={COMMUNITY_LIMITS.comment.max}
        rows={2}
        required
        error={error}
        onChange={(event) => setText(event.target.value)}
      />
      <div>
        <Button type="submit" aria-disabled={busy || undefined}>
          {busy ? "Gönderiliyor…" : "Yorumu gönder"}
        </Button>
      </div>
    </form>
  );
}
