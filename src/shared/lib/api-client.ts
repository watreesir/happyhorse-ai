export type ApiErrorDetails = {
  message: string;
  status: number;
  code?: number;
  data?: unknown;
  errorCode?: string;
};

export class ApiResponseError extends Error {
  status: number;
  code?: number;
  data?: unknown;
  errorCode?: string;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiResponseError';
    this.status = details.status;
    this.code = details.code;
    this.data = details.data;
    this.errorCode = details.errorCode;
  }
}

function readPayloadErrorCode(payload: Record<string, unknown>) {
  if (typeof payload.errorCode === 'string' && payload.errorCode.trim()) {
    return payload.errorCode;
  }

  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const errorCode = (data as Record<string, unknown>).errorCode;
    if (typeof errorCode === 'string' && errorCode.trim()) {
      return errorCode;
    }
  }

  return undefined;
}

export async function readApiError(
  response: Response,
  fallback = `request failed with status: ${response.status}`
): Promise<ApiErrorDetails> {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await response.clone().json();
      if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const message =
          typeof record.message === 'string' && record.message.trim()
            ? record.message
            : typeof record.error === 'string' && record.error.trim()
              ? record.error
              : fallback;
        return {
          message,
          status: response.status,
          code: typeof record.code === 'number' ? record.code : undefined,
          data: record.data,
          errorCode: readPayloadErrorCode(record),
        };
      }
    }

    const text = await response.clone().text();
    if (text.trim()) {
      return {
        message: text,
        status: response.status,
      };
    }
  } catch {
    // Keep the original fallback if the response body is not readable.
  }

  return {
    message: fallback,
    status: response.status,
  };
}

export async function createApiResponseError(
  response: Response,
  fallback = `request failed with status: ${response.status}`
) {
  return new ApiResponseError(await readApiError(response, fallback));
}

export async function readApiErrorMessage(
  response: Response,
  fallback = `request failed with status: ${response.status}`
) {
  return (await readApiError(response, fallback)).message;
}
