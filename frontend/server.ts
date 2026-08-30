import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Proxy to the real HeatIQ FastAPI backend
const PYTHON_BACKEND_URL = process.env.HEATIQ_BACKEND_URL || 'http://127.0.0.1:8000';

// ─── /api/backend/health ──────────────────────────────────────────────────────
app.get('/api/backend/health', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const pyRes = await fetch(`${PYTHON_BACKEND_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const data = await pyRes.json();
      return res.json({ status: 'ok', source: 'python_fastapi', data });
    }

    return res.status(pyRes.status).json({
      error: `Backend returned HTTP ${pyRes.status}`,
      python_target: PYTHON_BACKEND_URL,
    });
  } catch {
    return res.status(503).json({
      error: 'Python backend unreachable',
      python_target: PYTHON_BACKEND_URL,
      hint: 'Start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000',
    });
  }
});

// ─── /api/backend/ask ─────────────────────────────────────────────────────────
app.post('/api/backend/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'question required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const pyRes = await fetch(`${PYTHON_BACKEND_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const data = await pyRes.json();
      return res.json(data);
    }

    // Pass through backend error codes (400, 422, 502, etc.)
    const errData = await pyRes.json().catch(() => ({}));
    return res.status(pyRes.status).json({
      error: errData.detail || errData.error || `Backend returned HTTP ${pyRes.status}`,
    });
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError';
    return res.status(503).json({
      error: isTimeout
        ? 'Backend agent timed out (30s) — the agent may still be processing'
        : 'Backend agent unavailable — start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000',
    });
  }
});

// ─── /api/backend/alerts/status ───────────────────────────────────────────────
app.get('/api/backend/alerts/status', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const pyRes = await fetch(`${PYTHON_BACKEND_URL}/alerts/status`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const data = await pyRes.json();
      return res.json(data);
    }

    return res.status(pyRes.status).json({
      error: `Backend returned HTTP ${pyRes.status}`,
    });
  } catch {
    return res.status(503).json({
      error: 'Backend unavailable — start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000',
    });
  }
});

// ─── Server startup ───────────────────────────────────────────────────────────
async function checkBackendOnStartup(): Promise<void> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PYTHON_BACKEND_URL}/health`, { signal: controller.signal });
    if (res.ok) {
      console.log(`✅ Python backend reachable at ${PYTHON_BACKEND_URL}`);
    } else {
      console.warn(`⚠️  WARNING: Python backend at ${PYTHON_BACKEND_URL} returned HTTP ${res.status}`);
      console.warn('   Start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000');
    }
  } catch {
    console.warn(`⚠️  WARNING: Python backend not reachable at ${PYTHON_BACKEND_URL}`);
    console.warn('   Start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000');
    console.warn('   The frontend will start, but all /api/backend/* requests will return 503 until the backend is running.');
  }
}

async function startServer() {
  // Warn loudly on startup if backend is missing — don't silently defer to first real request
  await checkBackendOnStartup();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HeatIQ frontend server running on http://localhost:${PORT}`);
    console.log(`   Backend proxy target: ${PYTHON_BACKEND_URL}`);
  });
}

startServer();
