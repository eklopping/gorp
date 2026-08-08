import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getUploadRoot } from "@/lib/uploads";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  if (!parts?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (parts.some((part) => part.includes("..") || part.includes("\\"))) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const relative = parts.join("/");
  const absolute = path.join(getUploadRoot(), relative);

  if (!absolute.startsWith(getUploadRoot())) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  try {
    const data = await fs.readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";

    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
