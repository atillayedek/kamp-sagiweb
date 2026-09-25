"use client";

import type { Post } from "@kampusagi/contracts";
import Link from "next/link";
import { useId, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import type { AuthorView } from "@/features/discover/authors";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/cn";
import { adjustCount, countLabel, visibilityBadges } from "./labels";
import { usePresence } from "./presence";
import { ReportButton } from "./ReportButton";

type PostCardProps = {
  id: string;
  post: Post;
  author: AuthorView;
  uid: string;
  showCommentsLink?: boolean;
  commentDelta?: number;
  onDeleted?: () => void;
};

export function PostCard({ id, post, author, uid, showCommentsLink = true, commentDelta = 0, onDeleted }: PostCardProps) {
  const nameId = useId();
  const own = post.authorUid === uid;
  const like = usePresence(`posts/${id}/likes/${uid}`, "createdAt", { failed: "Beğeni kaydedilemedi" });
  const likes = adjustCount(post.likeCount, like.state);
  const comments = Math.max(0, post.commentCount + commentDelta);
  const liked = like.state.status === "ready" && like.state.on;
  const visibility = visibilityBadges[post.visibility];

  return (
    <Card as="article" aria-labelledby={nameId} className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <Avatar name={author.name} size="sm" decorative />
        <div className="min-w-0 flex-1 text-sm">
          <p id={nameId} className="font-semibold text-ink">
            {author.name}
          </p>
          <p className="text-ink-muted">
            {author.department} · <span>{formatDateTime(post.createdAt)}</span>
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {author.verified && <VerifiedBadge />}
          <Badge tone="neutral" icon={visibility.icon}>
            {visibility.label}
          </Badge>
        </span>
      </div>
      <p className="whitespace-pre-line break-words text-ink">{post.text}</p>
      <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
        <Button
          variant="ghost"
          className={cn("min-h-11 px-3 text-sm", liked && "text-danger")}
          aria-pressed={like.state.status === "ready" ? liked : undefined}
          aria-disabled={like.state.status !== "ready" || like.state.busy || undefined}
          onClick={() => void like.toggle()}
        >
          <Icon name="heart" className={cn("size-4.5", liked && "fill-current")} />
          Beğen
          <span className="tabular-nums text-ink-muted">({countLabel(likes, "beğeni")})</span>
        </Button>
        {showCommentsLink ? (
          <Link
            href={`/topluluklar/gonderi/${id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
          >
            <Icon name="chat" className="size-4.5" />
            Yorumlar
            <span className="tabular-nums text-ink-muted">({countLabel(comments, "yorum")})</span>
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-ink-muted">
            <Icon name="chat" className="size-4.5" />
            {countLabel(comments, "yorum")}
          </span>
        )}
        <span className="ml-auto flex items-center">
          {own ? (
            <DeletePostButton postId={id} onDeleted={onDeleted} />
          ) : (
            <ReportButton compact target={{ type: "post", postId: id }} subject={`${author.name} gönderisi`} />
          )}
        </span>
      </div>
    </Card>
  );
}

function DeletePostButton({ postId, onDeleted }: { postId: string; onDeleted?: () => void }) {
  const { functions } = useConnectors();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await functions.call("deletePost", { postId });
      toast.show({ title: "Gönderi silindi", tone: "success" });
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      toast.show({ title: "Gönderi silinemedi", description: toAppError(error).message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="min-h-11 px-3 text-sm text-danger" aria-label="Sil: gönderin" onClick={() => setOpen(true)}>
        <Icon name="trash" className="size-4.5" />
        Sil
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Gönderiyi sil"
        description="Gönderin, yorumları ve beğenileriyle birlikte kalıcı olarak silinir."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              {busy ? "Siliniyor…" : "Gönderiyi sil"}
            </Button>
          </>
        }
      >
        <p className="text-ink">Bu işlem geri alınamaz.</p>
      </Modal>
    </>
  );
}
