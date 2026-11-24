import express from 'express';
import routes from '../src/routes.js';

const app = express();

app.use(express.json());

// Agrupa as rotas sob o prefixo /api (opcional, mas comum)
app.use('/api', routes);

export default app;