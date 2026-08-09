import { google } from 'googleapis';
import { env } from './env.js';

export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function isGoogleConfigured() {
  return env.GOOGLE_CLIENT_ID !== '' && env.GOOGLE_CLIENT_SECRET !== '';
}

export function createOAuthClient() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}
