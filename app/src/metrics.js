// Prometheus metrics cho web app (thư viện prom-client)
// Endpoint /metrics chỉ dùng nội bộ cho Prometheus, Nginx chặn truy cập từ bên ngoài.
const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'qlsv-app' });

// Metrics mặc định của Node.js: CPU, RAM, event loop, GC...
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Tong so HTTP request',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thoi gian xu ly HTTP request (giay)',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const dbRecords = new client.Gauge({
  name: 'qlsv_records',
  help: 'So ban ghi hien co trong tung bang',
  labelNames: ['table'],
  registers: [register],
});

// Gán nhãn route ổn định (vd: /sinh-vien/:id/edit) để tránh bùng nổ số lượng label
function routeLabel(req, resources) {
  if (!req.route) return 'unmatched';
  const r = req.params.resource;
  return req.route.path.replace(':resource', r && resources[r] ? r : 'unknown');
}

function middleware(resources) {
  return (req, res, next) => {
    if (req.path === '/metrics' || req.path === '/healthz') return next();
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      const labels = { method: req.method, route: routeLabel(req, resources), status: String(res.statusCode) };
      httpRequestsTotal.inc(labels);
      end(labels);
    });
    next();
  };
}

module.exports = { register, middleware, dbRecords };
