import { raw } from 'hono/html';
import type { PropsWithChildren } from 'hono/jsx';

// JSX cannot express a doctype, so it is emitted as a trusted raw string.
const doctype = raw('<!DOCTYPE html>');

export function Layout({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <>
      {doctype}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
        </head>
        <body>
          <main>{children}</main>
        </body>
      </html>
    </>
  );
}
