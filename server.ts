import app from './server/api';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments (--port 3000)
const cliArgs = process.argv.slice(2);
const portFlagIndex = cliArgs.indexOf('--port');
const cliPort = portFlagIndex !== -1 && cliArgs[portFlagIndex + 1] ? parseInt(cliArgs[portFlagIndex + 1], 10) : null;
const envPort = process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : null;
const port = cliPort || envPort || 3000;

// Server Initialization
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/stac')) return next();
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(port, '0.0.0.0', () => {
      console.log(`MarsNav server listening on port ${port} (mode: ${process.env.NODE_ENV || 'development'})`);
    });
  }
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
