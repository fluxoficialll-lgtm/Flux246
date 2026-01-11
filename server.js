import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dbManager } from './backend/databaseManager.js';
import { storageService } from './backend/services/storageService.js';
import apiRoutes from './backend/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

// Configuração refinada do CORS para o Socket.io
const io = new Server(httpServer, {
    cors: { 
        origin: true, // Reflete a origem da requisição
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    socket.on('join_user', (email) => socket.join(email));
    socket.on('join_chat', (chatId) => socket.join(chatId));
});

app.set('trust proxy', 1);

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// Middlewares Globais
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// CONFIGURAÇÃO DE CORS RESTRITA E SEGURA
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como apps mobile nativos ou ferramentas de teste)
    if (!origin) return callback(null, true);
    
    // Lista de endereços explícitos permitidos
    const allowedOrigins = [
      'https://admflux12.onrender.com',
      'https://flux154.onrender.com'
    ];
    
    // Padrões permitidos (localhost para desenvolvimento)
    const allowedPatterns = [/localhost/];
    
    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const matchesPattern = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isExplicitlyAllowed || matchesPattern) {
      callback(null, true);
    } else {
      // Bloqueia qualquer outra origem não listada para maior segurança
      console.warn(`[CORS] Bloqueado acesso de origem não autorizada: ${origin}`);
      callback(new Error('Acesso não permitido por políticas de CORS.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
}));

app.use(compression());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug Middleware
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production' || req.path.startsWith('/api')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'N/A'}`);
    }
    req.io = io;
    next();
});

// Inicialização do Banco
dbManager.init()
    .then(() => console.log("✅ Database initialized successfully."))
    .catch(err => console.error("❌ DB Init Error:", err));

// Rota de Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    try {
        const folder = req.body.folder || 'misc';
        const fileUrl = await storageService.uploadFile(req.file, folder);
        res.json({ success: true, files: [{ url: fileUrl }] });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar upload para nuvem' });
    }
});

// Rotas da API
app.use('/api', apiRoutes);
app.get('/ping', (req, res) => res.send('pong'));

// Configuração de Arquivos Estáticos (Frontend)
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// SPA Catch-all
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `Endpoint de API não encontrado: ${req.path}` });
    }
    
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found.');
    }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}. Mode: ${process.env.NODE_ENV || 'development'}`);
});