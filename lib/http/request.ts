export class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super(status === 413 ? "Request body is too large" : "Invalid JSON object");
  }
}

export async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > limit) throw new RequestBodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel().catch(() => {});
        throw new RequestBodyError(413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    const value: unknown = JSON.parse(body + decoder.decode());
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestBodyError(400);
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally {
    reader.releaseLock();
  }
}
