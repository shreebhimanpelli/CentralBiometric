import { Card, CardHeader } from "@/components/ui/Card";

/** Standard content panel used on list / data pages */
export function ContentPanel({
  title,
  description,
  action,
  children,
  noPadding = false,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <Card padding={false}>
      {title && <CardHeader title={title} description={description} action={action} />}
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </Card>
  );
}
