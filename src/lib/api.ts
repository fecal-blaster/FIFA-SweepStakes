import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function ok<T>(data: T, init?: number | ResponseInit): NextResponse {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function badRequest(message: string, detail?: unknown): NextResponse {
  return NextResponse.json({ error: message, detail }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function rateLimited(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) }
    }
  );
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new ApiError(400, "Validation failed", e.flatten());
    throw e;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export function handleError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, detail: e.detail }, { status: e.status });
  }
  const status = (e as { status?: number })?.status;
  if (status === 401) return unauthorized();
  console.error("Unhandled API error:", e);
  return serverError();
}
