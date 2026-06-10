const FORBIDDEN_CORS_ORIGINS = new Set(['*', 'null']);

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && !FORBIDDEN_CORS_ORIGINS.has(origin));
}

function applyCors(req, res) {
  const requestOrigin = req.get('origin');
  res.set('Vary', 'Origin');

  if (!requestOrigin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(requestOrigin)) {
    return false;
  }

  res.set('Access-Control-Allow-Origin', requestOrigin);
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Max-Age', '3600');

  return true;
}

module.exports = {
  applyCors,
  getAllowedOrigins,
};
