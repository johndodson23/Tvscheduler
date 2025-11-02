import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

export const supabase = createClient(SUPABASE_URL, publicAnonKey);

export async function signUp(email: string, password: string, name: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-e949556f/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  const data = await response.json();
  
  // Sign in to get the session
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) throw signInError;

  if (sessionData.session) {
    localStorage.setItem('access_token', sessionData.session.access_token);
  }

  return sessionData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.session) {
    localStorage.setItem('access_token', data.session.access_token);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  localStorage.removeItem('access_token');
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    localStorage.setItem('access_token', data.session.access_token);
  }
  return data.session;
}
