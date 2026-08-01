// lib/whatsapp/resolveAndStoreMedia.ts
import { put } from "@vercel/blob";

const D360_BASE_URL = "https://waba-v2.360dialog.io"; // switch if still on sandbox

type ResolvedMedia = {
  mediaUrl: string;
  mediaType: string; // mime type
  sizeBytes?: number;
};

export async function resolveAndStoreMedia(
  mediaId: string,
): Promise<ResolvedMedia> {
  // Step 1: get metadata + a short-lived lookaside URL
  const metaRes = await fetch(`${D360_BASE_URL}/${mediaId}`, {
    headers: { "D360-API-KEY": process.env.D360_API_KEY! },
  });
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    console.error("Media metadata fetch failed:", metaRes.status, errText);
    throw new Error(`Failed to fetch media metadata: ${metaRes.status}`);
  }
  const meta = await metaRes.json(); // { url, mime_type, sha256, file_size, id }

  // Step 2: swap host per 360dialog's docs, then download within the 5-minute window
  const downloadUrl = meta.url.replace(
    "https://lookaside.fbsbx.com",
    D360_BASE_URL,
  );
  const fileRes = await fetch(downloadUrl, {
    headers: { "D360-API-KEY": process.env.D360_API_KEY! },
  });
  if (!fileRes.ok) {
    throw new Error(`Failed to download media bytes: ${fileRes.status}`);
  }
  const fileBuffer = await fileRes.arrayBuffer();

  // Step 3: re-host durably so it doesn't expire
  const extension = meta.mime_type?.split("/")[1] || "bin";
  const blob = await put(
    `handoffs/${mediaId}.${extension}`,
    Buffer.from(fileBuffer),
    {
      access: "public", // unguessable URL; keep it out of frontend-facing responses regardless — see note above
      contentType: meta.mime_type,
    },
  );

  return {
    mediaUrl: blob.url,
    mediaType: meta.mime_type,
    sizeBytes: meta.file_size,
  };
}
