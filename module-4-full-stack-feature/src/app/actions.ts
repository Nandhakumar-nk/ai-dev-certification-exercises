"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createPost(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    throw new Error("Title and body are required");
  }

  await prisma.post.create({ data: { title, body } });

  revalidatePath("/");
}
