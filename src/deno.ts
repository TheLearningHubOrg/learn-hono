// Deno entry: deno serve --port 8080 --unstable-sloppy-imports src/deno.ts
// `deno serve` calls the default export's fetch(). Sloppy imports let Deno
// resolve the './x.js' specifiers that the NodeNext module setting requires.
import { createApp } from './app.js';

export default createApp({ log: true });
