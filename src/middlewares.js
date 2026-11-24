import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_super_segura';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token mal formatado.' });
  }

  const [, token] = parts;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.userId = decoded.id;
    req.userRole = decoded.tipoPerfil;
    req.user = { id: decoded.id, tipoPerfil: decoded.tipoPerfil };
    
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}