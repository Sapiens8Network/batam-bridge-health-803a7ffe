/**
 * Transport layer. When VITE_API_BASE_URL is configured every call goes to the
 * real backend; otherwise the request resolves against the in-memory mock
 * backend so the app is fully usable offline. Swapping to production is a
 * config change, not a code change.
 */
export const API_BASE_URL: string = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";
export const isMockMode = API_BASE_URL === "";

const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; mock: () => T },
): Promise<T> {
  const method = options.method ?? "GET";

  if (isMockMode) {
    await latency();
    return options.mock();
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  if (!res.ok) throw new ApiError(`${method} ${path} failed`, res.status);
  return (await res.json()) as T;
}
