// routes.js
import { Router } from 'express';
import multer from 'multer';
import prisma from './prisma.js';
import { register, login } from './auth.js';
import { authMiddleware } from './middlewares.js';
import { uploadFoto } from './upload.js';

const router = Router();

// Multer em memória — o buffer fica disponível em req.file.buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use PNG, JPG, WEBP ou GIF.'));
    }
    cb(null, true);
  },
});

// --- ROTAS PÚBLICAS ---
router.post('/auth/register', register);
router.post('/auth/login', login);

// Feed de pets
router.get('/pets', async (req, res) => {
  try {
    const { especie, porte, cidade } = req.query;

    const pets = await prisma.pet.findMany({
      where: {
        status: 'DISPONIVEL',
        ...(especie && { especie }),
        ...(porte && { porte }),
        ...(cidade && { tutor: { cidade: { contains: cidade, mode: 'insensitive' } } }),
      },
      include: {
        tutor: {
          select: { id: true, nome: true, cidade: true, estado: true, verificado: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(pets);
  } catch (error) {
    console.error('Erro ao buscar pets:', error);
    return res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

// --- UPLOAD (protegido) ---
router.post('/upload', authMiddleware, upload.single('foto'), uploadFoto);

// --- ROTAS PROTEGIDAS ---

// Cadastrar novo pet
router.post('/pets', authMiddleware, async (req, res) => {
  try {
    const {
      nome,
      especie,
      raca,
      idadeEstimada,
      porte,
      sexo,
      castrado,
      vacinado,
      vermifugado,
      descricaoTemperamento,
      necessidadesEspeciais,
      fotos,
    } = req.body;

    // Validação mínima
    if (!nome || !especie || !porte) {
      return res.status(400).json({ error: 'nome, especie e porte são obrigatórios.' });
    }

    // Normaliza fotos: aceita string (data URI ou URL) ou { url }
    const fotosNormalizadas = Array.isArray(fotos)
      ? fotos.map(f => (typeof f === 'string' ? f : f?.url)).filter(Boolean)
      : [];

    const pet = await prisma.pet.create({
      data: {
        nome,
        especie,
        raca: raca || null,
        idadeEstimada: idadeEstimada || null,
        porte,
        sexo: sexo || 'MACHO', // fallback; ideal é exigir no front
        castrado: Boolean(castrado),
        vacinado: Boolean(vacinado),
        vermifugado: Boolean(vermifugado),
        descricaoTemperamento: descricaoTemperamento || null,
        necessidadesEspeciais: necessidadesEspeciais || null,
        fotos: fotosNormalizadas,
        tutorId: req.userId,
      },
    });

    return res.status(201).json(pet);
  } catch (error) {
    console.error('Erro ao cadastrar pet:', error); // ⚠️ loga o erro real
    return res.status(500).json({ error: 'Erro ao cadastrar pet.' });
  }
});

// Solicitar adoção
router.post('/pets/:id/adopt', authMiddleware, async (req, res) => {
  try {
    const { id: petId } = req.params;
    const { formularioRespostas } = req.body;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.status !== 'DISPONIVEL') {
      return res.status(400).json({ error: 'Pet indisponível para adoção.' });
    }

    const request = await prisma.adoptionRequest.create({
      data: {
        petId,
        adotanteId: req.userId,
        formularioRespostas: formularioRespostas || {},
      },
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao solicitar adoção:', error);
    return res.status(500).json({ error: 'Erro ao enviar solicitação de adoção.' });
  }
});

// Aprovar ou recusar adoção
router.patch('/adoptions/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const adoption = await prisma.adoptionRequest.findUnique({
      where: { id },
      include: { pet: true },
    });

    if (!adoption) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (adoption.pet.tutorId !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão para alterar esta solicitação.' });
    }

    const updatedAdoption = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.adoptionRequest.update({
        where: { id },
        data: { status },
      });

      if (status === 'APROVADA') {
        await tx.pet.update({
          where: { id: adoption.petId },
          data: { status: 'ADOTADO' },
        });
      }

      return reqUpdated;
    });

    return res.json(updatedAdoption);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status da adoção.' });
  }
});

export default router;