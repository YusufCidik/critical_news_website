"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-6 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-red-300">System alert</p>
        <h2 className="text-2xl font-semibold text-white">IntelMatrix failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {error.message || "An unexpected error occurred while rendering the intelligence dashboard."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
