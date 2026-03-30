INSERT INTO request_logs (request_id, url, method, status_code, response_time_ms, source, observed_at)
VALUES
  ('REQ-1942', '/api/auth/login', 'POST', 200, 182, 'web-frontend', '2026-03-27T13:58:12+05:30'),
  ('REQ-1938', '/api/orders/42', 'DELETE', 503, 1330, 'ops-console', '2026-03-27T13:55:48+05:30'),
  ('REQ-1930', '/api/products', 'GET', 200, 278, 'mobile-app', '2026-03-27T13:52:30+05:30'),
  ('REQ-1926', '/api/payments/charge', 'POST', 429, 842, 'checkout-ui', '2026-03-27T13:47:11+05:30'),
  ('REQ-1918', '/api/analytics/report', 'GET', 200, 664, 'internal-cron', '2026-03-27T13:41:24+05:30'),
  ('REQ-1904', '/api/notifications', 'GET', 500, 1603, 'worker-cluster', '2026-03-27T13:33:09+05:30')
ON CONFLICT (request_id) DO NOTHING;

INSERT INTO endpoint_metrics (endpoint, method, total_requests, avg_latency_ms, latency_tone, success_rate, error_rate, updated_at)
VALUES
  ('/api/products/1', 'PUT', 13, 486, 'warn', 76.9, 23.1, NOW()),
  ('/api/analytics/report', 'GET', 12, 689, 'warn', 91.7, 8.3, NOW()),
  ('/api/users', 'GET', 10, 279, 'good', 90.0, 10.0, NOW()),
  ('/api/auth/login', 'POST', 10, 822, 'warn', 100.0, 0.0, NOW()),
  ('/api/orders/42', 'DELETE', 8, 1330, 'bad', 62.5, 37.5, NOW()),
  ('/api/payments/charge', 'POST', 8, 225, 'good', 75.0, 25.0, NOW()),
  ('/api/products', 'GET', 8, 478, 'warn', 100.0, 0.0, NOW()),
  ('/api/auth/profile', 'GET', 7, 742, 'warn', 71.4, 28.6, NOW()),
  ('/api/users', 'POST', 7, 1089, 'bad', 100.0, 0.0, NOW()),
  ('/api/notifications', 'GET', 7, 1603, 'bad', 71.4, 28.6, NOW())
ON CONFLICT (endpoint, method) DO NOTHING;

INSERT INTO alerts (id, title, service, severity, status, owner, summary, rule_type, endpoint, started_at, updated_at)
VALUES
  (401, 'Orders API latency spike', 'Order Engine', 'critical', 'open', 'SRE Team', 'P95 latency crossed 1.2s after a burst of delete and refund traffic.', 'latency_threshold', '/api/orders/42', '2026-03-27T13:56:00+05:30', NOW()),
  (398, 'Webhook retries elevated', 'Notification Worker', 'warning', 'investigating', 'Platform Ops', 'Retry queue increased by 37% and upstream delivery is oscillating.', 'rate_limit', '/api/notifications', '2026-03-27T13:34:00+05:30', NOW()),
  (392, 'Auth flow recovered', 'Identity Gateway', 'healthy', 'resolved', 'Access Team', 'Token refresh incidents auto-resolved after cache warm-up completed.', 'recovery', '/api/auth/login', '2026-03-27T13:47:00+05:30', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT setval('alerts_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM alerts), 1), true);
