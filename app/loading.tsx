export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded-full bg-gray-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
      </div>
      <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-20 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-20 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    </div>
  );
}
