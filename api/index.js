// Vercel serverless entry: every /api/* request is handled by the same handler as the local server.
// Static files (index.html, css, js, images) are served directly by Vercel's CDN from /public.
import { handler } from '../server.js';

export default handler;
