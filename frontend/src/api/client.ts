export type ApiFailure = {
  status: number;
  message: string;
  data?: unknown;
};

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor({ status, message, data }: ApiFailure) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Standard HTTP request wrapper with uniform JSON serialization,
 * typed error extraction, and automatic payload unwrapping.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "";
  const targetUrl = baseUrl ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}` : path;

  try {
    response = await fetch(targetUrl, {
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
      ...init,
    });
  } catch {
    throw new ApiError({
      status: 0,
      message: "The server is not answering. Please ensure the backend is running.",
    });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError({
      status: response.status,
      message: body?.error ?? body?.message ?? `The server responded with status ${response.status}.`,
      data: body?.data,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // If payload is wrapped in the standard backend envelope { code, message, data }
  if (json && typeof json === "object" && "data" in json && "message" in json) {
    return json.data as T;
  }

  return json as T;
}

