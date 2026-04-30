import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn && !Sentry.isInitialized()) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  });
}

export { Sentry };

export function withSentry(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      Sentry.captureException(err, {
        extra: {
          url: req.url,
          method: req.method,
          query: req.query,
        },
      });
      try {
        await Sentry.flush(2000);
      } catch {}
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Internal server error' });
      }
    }
  };
}
