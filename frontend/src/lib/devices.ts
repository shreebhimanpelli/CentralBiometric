export function formatDeviceIds(ids: string[] | null | undefined): string {
  if (!ids?.length) return "—";
  return ids.join(", ");
}
