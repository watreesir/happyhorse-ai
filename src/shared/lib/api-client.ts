export async function readApiErrorMessage(
  response: Response,
  fallback = `request failed with status: ${response.status}`
) {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await response.clone().json();
      if (payload && typeof payload === 'object') {
        if (typeof payload.message === 'string' && payload.message.trim()) {
          return payload.message;
        }
        if (typeof payload.error === 'string' && payload.error.trim()) {
          return payload.error;
        }
      }
    }

    const text = await response.clone().text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Keep the original fallback if the response body is not readable.
  }

  return fallback;
}
