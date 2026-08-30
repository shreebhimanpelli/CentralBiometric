export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="py-10 text-center flame-text-muted animate-pulse">
      {message}
    </div>
  );
}
