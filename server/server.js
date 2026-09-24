// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { InMemoryStore } = require('./repositories/InMemoryStore');
const { CompositeEvaluator } = require('./evaluators/CompositeEvaluator');
const { createApiRouter } = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Store & Composite Evaluator
const store = new InMemoryStore();
const compositeEvaluator = new CompositeEvaluator({
  apiKey: process.env.GEMINI_API_KEY
});

// Mount API routes
app.use('/api', createApiRouter(store, compositeEvaluator));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend production build if available
const clientBuildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(clientBuildPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  const indexHtml = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('LLD Platform API Server Running. Start the Vite client on port 5173 for development.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LLD Practice Platform Server running on http://localhost:${PORT}`);
  console.log(`📋 Loaded ${store.getProblems().length} Curated LLD Practice Problems.`);
});
