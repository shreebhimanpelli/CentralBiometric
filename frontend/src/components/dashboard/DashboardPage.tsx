import { PageHeader, PageSection } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { BackLink } from "@/components/ui/BackLink";

interface DashboardPageProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  loading?: boolean;
  loadingMessage?: string;
  error?: string;
  children: React.ReactNode;
}

/** Consistent shell for every dashboard sub-page */
export function DashboardPage({
  title,
  description,
  action,
  backHref,
  backLabel,
  loading,
  loadingMessage = "Loading...",
  error,
  children,
}: DashboardPageProps) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }

  return (
    <PageSection>
      {backHref && <BackLink href={backHref} label={backLabel} />}
      <PageHeader title={title} description={description} action={action} />
      {error && <Alert message={error} />}
      <div className="flame-page-content">{children}</div>
    </PageSection>
  );
}
