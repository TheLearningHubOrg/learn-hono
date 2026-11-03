// Cloudflare Workers entry: point "main" in wrangler.jsonc here.
// The platform calls app.fetch(request, env, ctx) for every request.
import { createApp } from './app.js';

export default createApp();
