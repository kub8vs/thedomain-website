export function authorized(req) {
  const pin = process.env.ACCESS_PIN;
  const cron = process.env.CRON_SECRET;
  const h = req.headers;
  if (cron && h.authorization === `Bearer ${cron}`) return true;
  if (!pin) return true;
  return h['x-pin'] === pin;
}
export function deny(res) { res.status(401).json({ error: 'Zły kod dostępu' }); }
