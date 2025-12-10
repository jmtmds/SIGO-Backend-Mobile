import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// --- ROTAS DE USUÁRIO ---

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

app.post('/login', async (req, res) => {
  const { matricula, password } = req.body;
  const user = await prisma.user.findUnique({ where: { matricula } });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Matrícula ou senha incorretos.' });
  }
  return res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    matricula: user.matricula
  });
});

app.get('/user/profile', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { matricula: '123456' }});
  res.json(user);
});

// --- ROTAS DE OCORRÊNCIA ---

app.get('/dashboard/stats', async (req, res) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const count = await prisma.occurrence.count({ where: { createdAt: { gte: today } } });
  
  res.json({
    occurrences_today: count,
    available_vehicles: 2,
    team_status: "Operacional"
  });
});

app.post('/occurrence/new', async (req, res) => {
  try {
    const data = req.body;
    let userId = data.userId;
    if (!userId) {
       const defaultUser = await prisma.user.findUnique({ where: { matricula: '123456'}});
       userId = defaultUser?.id || 'erro-sem-user';
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
    console.error(error);
    res.status(500).json({ error: "Erro ao salvar ocorrência" });
  }
});

// Rota de Listagem
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

// Rota de Mudar Status
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

// --- NOVA ROTA: EDITAR DETALHES (PUT) ---
app.put('/occurrence/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body; // Recebe os novos dados (descricao, endereco, etc)

  try {
    const updated = await prisma.occurrence.update({
      where: { id },
      data: {
        descricao: data.descricao,
        endereco: data.endereco,
        ponto_referencia: data.ponto_referencia,
        prioridade: data.prioridade,
        // Adicione outros campos se quiser permitir editar
      }
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao editar:", error);
    res.status(500).json({ error: "Erro ao editar ocorrência" });
  }
});

app.listen(8000, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando em http://localhost:8000');
});