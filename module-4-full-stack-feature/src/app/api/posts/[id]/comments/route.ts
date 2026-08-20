import { prisma } from "@/lib/prisma";

function parsePostId(id: string): number | null {
  const postId = Number(id);
  return Number.isInteger(postId) ? postId : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parsePostId(id);

  if (postId === null) {
    return Response.json({ error: "Invalid post id" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parsePostId(id);

  if (postId === null) {
    return Response.json({ error: "Invalid post id" }, { status: 400 });
  }

  const data = await request.json();
  const authorName = String(data.authorName ?? "").trim();
  const body = String(data.body ?? "").trim();

  if (!authorName || !body) {
    return Response.json(
      { error: "authorName and body are required" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return Response.json({ error: "Post not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { authorName, body, postId },
  });

  return Response.json(comment, { status: 201 });
}
