export function Alert({ message }: { message: string }) {
  return (
    <div className="flame-card border-red-200 bg-red-50 p-4 text-base text-red-700" role="alert">
      {message}
    </div>
  );
}
