"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import type { Comment } from "@/server/domain/comment";

export interface CommentThreadProps {
  comments: Comment[];
  canPost: boolean;
  postUrl: string;
}

export function CommentThread({ comments, canPost, postUrl }: CommentThreadProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("comment") ?? "").trim();
    if (!body) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't post that comment.");
        setSubmitting(false);
        return;
      }
      event.currentTarget.reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex flex-col gap-1 rounded-rc-control bg-surface-2 p-4">
          <p className="text-[13px] font-medium text-ink">{comment.authorName}</p>
          <p className="text-xs text-ink-secondary">{comment.body}</p>
        </div>
      ))}

      {canPost ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Field
            label="Comment"
            hideLabel
            id="comment"
            name="comment"
            placeholder="Write a comment…"
            containerClassName="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={submitting} className="w-[140px]">
            {submitting ? "Posting…" : "Post comment"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
