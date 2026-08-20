"use client";

import { useState } from "react";
import type { Comment } from "@/generated/prisma/client";
import styles from "../../page.module.css";

export function CommentSection({
  postId,
  initialComments,
}: {
  postId: number;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add comment");
        return;
      }

      setComments((prev) => [...prev, data]);
      setAuthorName("");
      setBody("");
    } catch {
      setError("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.comments}>
      <h2>Comments</h2>

      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.comment}>
              <strong>{comment.authorName}</strong>
              <p>{comment.body}</p>
              <time dateTime={new Date(comment.createdAt).toISOString()}>
                {new Date(comment.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="authorName">Name</label>
          <input
            id="authorName"
            name="authorName"
            type="text"
            required
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="body">Comment</label>
          <textarea
            id="body"
            name="body"
            rows={3}
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Posting..." : "Add comment"}
        </button>
      </form>
    </section>
  );
}
