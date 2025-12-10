import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors()); // Libera acesso para o Mobile

// Log de todas as requisições para ajudar a debuggar
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// --- ROTA 1: CRIAR USUÁRIO INICIAL (SEED) ---
// Rode isso uma vez pelo navegador ou Postman para criar o Carlos
app.get('/seed', async (req, res) => {
  try {
    const user = await prisma.user.upsert({
      where: { matricula: '123456' },
      update: {},
      create: {
        name: 'Carlos Ferreira',
        role: '2º Tenente',
        matricula: '123456',
        password: '123', // Senha simples para teste
      },
    });
    res.json({ message: 'Usuário Carlos criado!', user });
  } catch (error) {
    res.status(500).json({ error });
  }
});

// --- ROTA 2: LOGIN ---
app.post('/login', async (req, res) => {
  const { matricula, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { matricula },
  });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Matrícula ou senha incorretos.' });
  }

  // Retorna os dados do usuário direto
  return res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    matricula: user.matricula
  });
});

// --- ROTA 3: PERFIL DO USUÁRIO ---
app.get('/user/profile', async (req, res) => {
  // Vamos buscar o Carlos para sempre retornar sucesso no teste se não houver auth
  const user = await prisma.user.findUnique({ where: { matricula: '123456' }});
  res.json(user);
});

// --- ROTA 4: DASHBOARD STATS ---
app.get('/dashboard/stats', async (req, res) => {
  // Conta quantas ocorrências foram criadas hoje
  const today = new Date();
  today.setHours(0,0,0,0);

  const count = await prisma.occurrence.count({
    where: {
      createdAt: {
        gte: today
      }
    }
  });

  res.json({
    occurrences_today: count,
    available_vehicles: 2, // Fixo por enquanto
    team_status: "Operacional"
  });
});

// --- ROTA 5: NOVA OCORRÊNCIA (Atualizada) ---
app.post('/occurrence/new', async (req, res) => {
  try {
    const data = req.body;
    
    // Precisamos de um ID de usuário. Vamos pegar o primeiro do banco
    // se o front não mandar (para teste)
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
        gps: JSON.stringify(data.gps), // Converte array GPS para string
        userId: userId,
        status: "Aberta" // <--- FORÇA O STATUS INICIAL AQUI
      }
    });

    console.log("Nova ocorrência criada:", occurrence.id);
    res.json(occurrence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao salvar ocorrência" });
  }
});

// --- ROTA 6: MINHAS OCORRÊNCIAS ---
app.get('/user/:id/occurrences', async (req, res) => {
  const { id } = req.params;
  
  // Se o ID vier "undefined" do front, usamos o do Carlos
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

// --- ROTA 7: ATUALIZAR STATUS (NOVA) ---
app.patch('/occurrence/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Espera receber { "status": "Finalizada" }

  try {
    const updated = await prisma.occurrence.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// Inicia o servidor na porta 8000
app.listen(8000, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando em http://localhost:8000');
});