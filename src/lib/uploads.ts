import fs from "node:fs/promises";
import path from "node:path";
import { createId } from "./ids";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function getUploadRoot() {
  const configured = process.env.UPLOAD_DIR ?? "./data/uploads";
  return path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export { uploadUrl } from "./upload-url";

export async function saveCampaignUpload(
  campaignId: string,
  file: File,
  kind: "entity" | "map",
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Images must be 8MB or smaller.");
  }

  const ext = EXT_BY_TYPE[file.type] ?? "bin";
  const filename = `${kind}_${createId()}.${ext}`;
  const relativePath = path.join(campaignId, filename);
  const absolutePath = path.join(getUploadRoot(), relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return relativePath.split(path.sep).join("/");
}
