import { createPost } from "./actions";
import styles from "./page.module.css";

export function NewPostForm() {
  return (
    <form action={createPost} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="body">Body</label>
        <textarea id="body" name="body" rows={4} required />
      </div>
      <button type="submit">Create post</button>
    </form>
  );
}
