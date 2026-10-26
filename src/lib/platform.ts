export function isWindowsPlatform(): boolean {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return navigator.userAgent.includes("Windows");
  }
  return typeof process !== "undefined" && process.platform === "win32";
}

export function isMacPlatform(): boolean {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return navigator.userAgent.includes("Mac");
  }
  return typeof process !== "undefined" && process.platform === "darwin";
}

export function getFileManagerLabel(): string {
  if (isWindowsPlatform()) return "Показать в Проводнике";
  if (isMacPlatform()) return "Показать в Finder";
  return "Показать в файловом менеджере";
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}
