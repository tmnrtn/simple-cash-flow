async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    // Send the session cookie. Same-origin by default, but explicit is clearer.
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    // Session missing or expired — let the app drop back to the login screen.
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    // Prefer the API's JSON error message when present.
    let message = `${method} ${path} failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON body; keep the default message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
