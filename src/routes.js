import { Router } from 'express';
import prisma from './prisma.js';
import { register, login } from './auth.js';
import { authMiddleware } from './middlewares.js';

const router = Router();

// --- ROTAS PÚBLICAS ---
router.post('/auth/register', register);
router.post('/auth/login', login);

// Feed de pets disponíveis com filtros básicos
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
    return res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

// --- ROTAS PROTEGIDAS ---

// Cadastrar novo pet (ONG / Protetor)
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

    const pet = await prisma.pet.create({
      data: {
        nome,
        especie,
        raca,
        idadeEstimada,
        porte,
        sexo,
        castrado: Boolean(castrado),
        vacinado: Boolean(vacinado),
        vermifugado: Boolean(vermifugado),
        descricaoTemperamento,
        necessidadesEspeciais,
        fotos: fotos || [],
        tutorId: req.userId,
      },
    });

    return res.status(201).json(pet);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar pet.' });
  }
});

// Solicitar adoção de um pet
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
    return res.status(500).json({ error: 'Erro ao enviar solicitação de adoção.' });
  }
});

// Aprovar ou recusar adoção (Tutor do pet)
router.patch('/adoptions/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'EM_ANALISE', 'APROVADA', 'RECUSADA', 'CANCELADA'

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

    // Atualiza o status da solicitação e trava o pet se aprovado
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
    return res.status(500).json({ error: 'Erro ao atualizar status da adoção.' });
  }
});

export default router;