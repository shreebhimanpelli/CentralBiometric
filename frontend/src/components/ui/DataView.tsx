export function DataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="flame-field-label">{label}</p>
      <div className="flame-field-value">{value}</div>
    </div>
  );
}

export function MobileCard({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article className="flame-mobile-card">
      {header && <div className="mb-3">{header}</div>}
      {children}
      {footer && <div className="mt-3 pt-3 border-t border-[var(--border)]">{footer}</div>}
    </article>
  );
}

export function DataTable({
  columns,
  children,
  minWidth = 560,
}: {
  columns: string[];
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="flame-data-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ResponsiveList({
  mobile,
  desktop,
}: {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}) {
  return (
    <>
      <div className="md:hidden space-y-3 p-4">{mobile}</div>
      <div className="hidden md:block">{desktop}</div>
    </>
  );
}
