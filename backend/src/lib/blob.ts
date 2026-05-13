import { put } from '@vercel/blob';

export async function uploadAsset(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const blob = await put(`assets/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}
