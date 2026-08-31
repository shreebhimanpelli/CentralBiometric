export function parseDeviceIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof raw === "string" && raw.length > 0) {
    return [raw];
  }
  return [];
}

export function formatDeviceIds(ids: string[]): string {
  return ids.join(", ");
}
