import { ContentPanel } from "@/components/dashboard/ContentPanel";

export function EmptyState({
  message,
  title = "No records",
}: {
  message: string;
  title?: string;
}) {
  return (
    <ContentPanel title={title}>
      <p className="text-center flame-text-muted py-6">{message}</p>
    </ContentPanel>
  );
}
