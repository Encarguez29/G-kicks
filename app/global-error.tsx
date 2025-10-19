"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-6">
        <h1 className="text-3xl font-semibold text-red-700">Something went wrong</h1>
        <p className="mt-2 text-red-600">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="mt-6">
          <button
            className="inline-block rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}