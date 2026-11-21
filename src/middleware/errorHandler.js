export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.status ?? 500;
  const code = error.code ?? 'INTERNAL_ERROR';

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500
        ? `Internal server error${code !== 'INTERNAL_ERROR' ? ` (${code}: ${error.message ?? 'unknown'})` : `: ${error.message ?? 'unknown'}`}`
        : error.message,
    },
  });
}
