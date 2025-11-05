import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e949556f`;

console.log('API Base URL:', BASE_URL);

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`API Call [${endpoint}]: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || publicAnonKey}`,
        ...options.headers,
      },
    });

    console.log(`API Response [${endpoint}]:`, response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error(`API Error [${endpoint}]:`, error);
      throw new Error(error.error || 'Request failed');
    }

    const data = await response.json();
    console.log(`API Success [${endpoint}]:`, data);
    return data;
  } catch (err: any) {
    console.error(`Network Error [${endpoint}]:`, err.message || err);
    throw err;
  }
}
