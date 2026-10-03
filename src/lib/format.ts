export function shortenHash(hash: string, length = 7): string {
  if (!hash) return "";
  return hash.slice(0, length);
}

export function formatRelativeDate(unixTimestamp: number | bigint): string {
  const ts = typeof unixTimestamp === "bigint" ? Number(unixTimestamp) : unixTimestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;

  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн назад`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} мес назад`;
  return `${Math.floor(diff / 31536000)} г назад`;
}

export function formatAbsoluteDate(unixTimestamp: number | bigint): string {
  const ts = typeof unixTimestamp === "bigint" ? Number(unixTimestamp) : unixTimestamp;
  return new Date(ts * 1000).toLocaleString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
