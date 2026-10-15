import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with required telemetry headers
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// MarsNav Gemini Chatbot Multi-Turn API Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'gemini-3.8-flash', systemInstruction } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Default System Instruction for MarsNav Mission AI
    const defaultInstruction =
      systemInstruction ||
      `You are ARES-Nav, the primary AI Flight Controller and Rover Mission Specialist for MarsNav.
Your mission is to advise rover drivers and mission planners on Martian surface exploration in Jezero Crater.
Key knowledge domains:
- Jezero Crater geological features: Western Delta Scarp, Kodiak Butte, Belva Crater Rim, South Séítah Megaripple Sand Dunes.
- Rover mobility and physics: 6-wheel Rocker-Bogie drive, wheel sinkage in loose sand, tilt and slope limits (max safe: 14°).
- Topography: MGS MOLA Aeroid datum (-2460m mean Jezero depth), HiRISE stereo DTMs, elevation profile cross-sections.
- Navigation: A* cost-aware graph search, balancing Euclidean distance vs. gravitational slope work and obstacle avoidance.
- Atmospheric context: Perseverance MEDA weather station data (cold thin CO2 atmosphere, ~740 Pa, dust optical depth).
Provide concise, authoritative, scientifically grounded, and engaging mission advice. Use bullet points or technical readouts when appropriate.`;

    // Map conversation history to Gemini contents format
    // Each item must be { role: 'user' | 'model', parts: [{ text }] }
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Choose requested model (supports gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite)
    let selectedModel = model;
    if (selectedModel !== 'gemini-4-argon' && selectedModel !== 'gemini-3.1-flash-lite') {
      selectedModel = 'gemini-3.8-flash';
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: defaultInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'Mission telemetry received. No text returned by model.';
    return res.json({ reply: replyText, modelUsed: selectedModel });
  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API',
    });
  }
});

// Setup Vite Dev Server Middleware or Static Production Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MarsNav Full-Stack Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
