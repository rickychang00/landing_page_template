export function resolveAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  // Vercel Blob URLs and external URLs are already absolute
  return path;
}
