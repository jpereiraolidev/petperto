import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_super_segura';

export async function register(req, res) {
  try {
    const { nome, email, senha, telefone, tipoPerfil, cidade, estado } = req.body;

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senhaHash,
        telefone,
        tipoPerfil: tipoPerfil || 'ADOTANTE',
        cidade,
        estado,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipoPerfil: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
}

export async function login(req, res) {
  try {
    const { email, senha } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const validPassword = await bcrypt.compare(senha, user.senhaHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, tipoPerfil: user.tipoPerfil },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipoPerfil: user.tipoPerfil,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
}