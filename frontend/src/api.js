const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  const url = `${apiBase}${path}` || path;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

export const api = {
  apiBase: apiBase || window.location.origin,
  register: (payload) => request('/api/url/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/url/login', { method: 'POST', body: payload }),
  shorten: (long_url) => request('/api/url/shorten_url', { method: 'POST', body: { long_url } }),
  analytics: (shortCode) => request(`/api/url/getUrlAnalytics/${encodeURIComponent(shortCode)}`)
};
