/**
 * MARSNAV Robust API Client
 * Handles JSON parsing, HTML error detection (Vercel routing errors),
 * and provides meaningful diagnostic feedback.
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  isHtml: boolean;
  url: string;
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const diagnosticUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');

    if (isHtml) {
      const text = await response.text();
      const isVercelError = text.includes('<!doctype') || text.includes('<html');
      
      let errorMsg = `API ROUTING ERROR: Expected JSON but received HTML. Status: ${response.status}.`;
      if (isVercelError) {
        errorMsg += ' This usually indicates a Vercel routing fallback to index.html (SPA mode).';
      }

      console.error(`[API ERROR] ${url}`, {
        status: response.status,
        contentType,
        url: diagnosticUrl,
        snippet: text.slice(0, 200)
      });

      return {
        data: null,
        error: errorMsg,
        status: response.status,
        isHtml: true,
        url: diagnosticUrl
      };
    }

    if (!response.ok) {
      let errorDetail = '';
      let errorCode = 'UNKNOWN_ERROR';
      
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson === 'object') {
          // Handle { success: false, error: { message, code } }
          const errorObj = errJson.error || errJson;
          errorDetail = errorObj.message || errorObj.error || JSON.stringify(errorObj);
          errorCode = errorObj.code || errorCode;
        } else {
          errorDetail = String(errJson);
        }
      } catch {
        errorDetail = await response.text();
      }

      const safeErrorDetail = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);

      return {
        data: null,
        error: `[${errorCode}] ${safeErrorDetail || response.statusText}`,
        status: response.status,
        isHtml: false,
        url: diagnosticUrl
      };
    }

    const data = await response.json();
    return {
      data,
      error: null,
      status: response.status,
      isHtml: false,
      url: diagnosticUrl
    };
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error(`[NETWORK ERROR] ${url}`, err);
    }
    return {
      data: null,
      error: `Network Error: ${err.message}. Ensure the backend is reachable.`,
      status: 0,
      isHtml: false,
      url: diagnosticUrl
    };
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T>(url: string, body: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}
