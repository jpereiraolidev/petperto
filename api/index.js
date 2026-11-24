import express from 'express';
import cors from 'cors';
import routes from '../src/routes.js';

const app = express();

// Lista de origens permitidas (URLs do seu front-end em produção e desenvolvimento)
const allowedOrigins = [
  'https://petperto.adote.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem "origin" (como aplicativos mobile ou ferramentas de teste tipo Postman/cURL)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelas políticas de CORS do PetPerto'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Aplica o CORS
app.use(cors(corsOptions));

app.use(express.json());

// Rotas da API
app.use('/api', routes);

export default app;