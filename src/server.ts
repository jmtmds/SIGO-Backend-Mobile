import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// Log para debug
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// --- ROTA DE SEED ---
app.get('/seed', async (req, res) => {
  try {
    const user = await prisma.user.upsert({
      where: { matricula: '123456' },
      update: {},
      create: {
        name: 'Carlos Ferreira',
        role: '2º Tenente',
        matricula: '123456',
        password: '123',
      },
    });
    res.json({ message: 'Usuário Carlos criado!', user });
  } catch (error) {
    res.status(500).json({ error });
  }
});

// --- ROTA LOGIN ---
app.post('/login', async (req, res) => {
  const { matricula, password } = req.body;
  const user = await prisma.user.findUnique({ where: { matricula } });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  return res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    matricula: user.matricula,
    email: user.email,
    phone: user.phone
  });
});

app.get('/user/profile', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { matricula: '123456' }});
  res.json(user);
});

// --- CORREÇÃO AQUI: DASHBOARD STATS ---
app.get('/dashboard/stats', async (req, res) => {
  // ANTES: Contava só as de hoje (createdAt >= today)
  // AGORA: Conta todas que NÃO estão finalizadas (Ativas)
  
  const count = await prisma.occurrence.count({
    where: {
      status: {
        not: 'Finalizada' // Conta 'Aberta' e 'Em Andamento'
      }
    }
  });
  
  res.json({
    occurrences_today: count, // Mantive o nome da variável pro front não quebrar
    available_vehicles: 2,
    team_status: "Operacional"
  });
});

// --- ROTA NOVA OCORRÊNCIA ---
app.post('/occurrence/new', async (req, res) => {
  try {
    const data = req.body;
    let userId = data.userId;
    if (!userId) {
       const defaultUser = await prisma.user.findUnique({ where: { matricula: '123456'}});
       userId = defaultUser?.id;
    }

    const occurrence = await prisma.occurrence.create({
      data: {
        categoria: data.categoria,
        subcategoria: data.subcategoria,
        prioridade: data.prioridade,
        descricao: data.descricao,
        endereco: data.endereco,
        ponto_referencia: data.ponto_referencia,
        codigo_viatura: data.codigo_viatura,
        gps: JSON.stringify(data.gps),
        userId: userId,
        status: "Aberta"
      }
    });
    res.json(occurrence);
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar ocorrência" });
  }
});

// --- LISTAR OCORRÊNCIAS ---
app.get('/user/:id/occurrences', async (req, res) => {
  const { id } = req.params;
  let userIdToUse = id;
  if (id === 'undefined' || !id) {
    const defaultUser = await prisma.user.findUnique({ where: { matricula: '123456'}});
    userIdToUse = defaultUser?.id || '';
  }

  const list = await prisma.occurrence.findMany({
    where: { userId: userIdToUse },
    orderBy: { createdAt: 'desc' }
  });
  res.json(list);
});

// --- ATUALIZAR STATUS ---
app.patch('/occurrence/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  try {
    const updated = await prisma.occurrence.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// --- EDITAR DADOS ---
app.put('/occurrence/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.occurrence.update({
      where: { id },
      data: {
        descricao: data.descricao,
        endereco: data.endereco,
        ponto_referencia: data.ponto_referencia,
        prioridade: data.prioridade,
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao editar ocorrência" });
  }
});

// --- DELETAR ---
app.delete('/occurrence/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.occurrence.delete({ where: { id } });
    res.json({ message: "Deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

// --- ROTA DE ATUALIZAR PERFIL ---
app.put('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        name,
        email, 
        phone 
      }
    });
    res.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

app.listen(8000, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando em http://localhost:8000');
});