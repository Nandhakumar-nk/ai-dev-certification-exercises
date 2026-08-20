import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewPostForm } from "./new-post-form";
import styles from "./page.module.css";

export default async function Home() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Posts</h1>

        <NewPostForm />

        {posts.length === 0 ? (
          <p>No posts yet. Create the first one above.</p>
        ) : (
          <ul className={styles.list}>
            {posts.map((post) => (
              <li key={post.id} className={styles.post}>
                <h2>
                  <Link href={`/posts/${post.id}`}>{post.title}</Link>
                </h2>
                <p>{post.body}</p>
                <time dateTime={post.createdAt.toISOString()}>
                  {post.createdAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
