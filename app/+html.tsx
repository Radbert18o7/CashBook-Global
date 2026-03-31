import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/** Same policy as `app/_layout.tsx` (Head); kept here for static `expo export --platform web` HTML shell. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.cloudinary.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.google.com",
].join('; ');

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
