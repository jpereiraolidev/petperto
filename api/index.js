import express from 'express';
import cors from 'cors';
import routes from '../src/routes.js';

const app = express();

// Lista de origens permitidas (SEM barra no final!)
const allowedOrigins = [
  'https://petpertoadote.vercel.app', // Produção
  'http://localhost:3000',            // Node/React local
  'http://localhost:5173',            // Vite local
  'http://127.0.0.1:5500',            // Live Server (VSCode)
  'http://localhost:5500'             // Live Server (alternativo)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem "origin" (como aplicativos mobile ou ferramentas de teste tipo Postman/cURL)
    if (!origin) return callback(null, true);
    
    // Verifica se a origem está na lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`Bloqueado pelo CORS: ${origin}`); // Ajuda a debugar
      callback(new Error('Bloqueado pelas políticas de CORS do PetPerto'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Importante se você usa cookies ou headers de auth
  optionsSuccessStatus: 200
};

// Aplica o CORS antes de tudo
app.use(cors(corsOptions));

// Middlewares
app.use(express.json({ limit: '10mb' })); // Aumentado o limite caso envie base64 ou payloads grandes

// Rotas da API
app.use('/api', routes);

// Tratamento básico de erro para o CORS (opcional, mas ajuda no front)
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});

export default app;