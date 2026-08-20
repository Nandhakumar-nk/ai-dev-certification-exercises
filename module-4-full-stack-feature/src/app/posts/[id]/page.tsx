import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CommentSection } from "./comment-section";
import styles from "../../page.module.css";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isInteger(postId)) {
    notFound();
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    notFound();
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/">&larr; Back to posts</Link>

        <article className={styles.post}>
          <h1>{post.title}</h1>
          <p>{post.body}</p>
          <time dateTime={post.createdAt.toISOString()}>
            {post.createdAt.toLocaleString()}
          </time>
        </article>

        <CommentSection postId={post.id} initialComments={comments} />
      </main>
    </div>
  );
}
