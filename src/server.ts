import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// Log de todas as requisições para ajudar a debuggar
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// --- ROTA SEED (Cria usuário inicial) ---
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

// --- LOGIN ---
app.post('/login', async (req, res) => {
  const { matricula, password } = req.body;
  const user = await prisma.user.findUnique({ where: { matricula } });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  res.json(user);
});

// --- PERFIL ---
app.get('/user/profile', async (req, res) => {
  // Retorna o Carlos fixo para simplificar o teste se não tiver ID
  const user = await prisma.user.findUnique({ where: { matricula: '123456' }});
  res.json(user);
});

// --- DASHBOARD ---
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

// --- NOVA OCORRÊNCIA ---
app.post('/occurrence/new', async (req, res) => {
  try {
    const data = req.body;
    
    // Se o front mandou userId, usa ele. Se não, usa o Carlos (fallback)
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
        userId: userId
      }
    });
    res.json(occurrence);
  } catch (error) {
    console.error("Erro no backend:", error);
    res.status(500).json({ error: "Erro ao salvar ocorrência" });
  }
});

// --- MINHAS OCORRÊNCIAS ---
app.get('/user/:id/occurrences', async (req, res) => {
  const { id } = req.params;
  const list = await prisma.occurrence.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' }""
  });
  res.json(list);
});

app.listen(8000, '0.0.0.0', () => {
  console.log('🚀 Backend rodando na porta 8000');
});