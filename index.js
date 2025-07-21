// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// --- ROTAS PÚBLICAS ---

app.get('/', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.send(`API funcional. Conexão com o banco de dados estabelecida. Hora do banco: ${time.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao conectar ao banco de dados');
  }
});

app.post('/usuarios', async (req, res) => {
  const { empresa_id, email, senha, nome_usuario } = req.body;
  if (!empresa_id || !email || !senha) {
    return res.status(400).send('empresa_id, email e senha são obrigatórios');
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await pool.query(
      'INSERT INTO usuarios (empresa_id, email, senha_hash, nome_usuario) VALUES ($1, $2, $3, $4) RETURNING id, email',
      [empresa_id, email, senhaHash, nome_usuario]
    );
    res.status(201).json(novoUsuario.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar usuário');
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(401).send('Credenciais inválidas');
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).send('Credenciais inválidas');
    }
    const token = jwt.sign(
      { usuario_id: usuario.id, empresa_id: usuario.empresa_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});

// --- MIDDLEWARE DE AUTENTICAÇÃO ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden
    }
    req.user = user;
    next();
  });
}

// --- ROTAS PROTEGIDAS ---

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  // Graças ao middleware, agora temos acesso a req.user com os dados do token
  const empresaId = req.user.empresa_id;

  try {
    // Exemplo: Busca todas as conversas da empresa do usuário logado
    const conversas = await pool.query('SELECT * FROM conversas WHERE empresa_id = $1', [empresaId]);
    res.json(conversas.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar dados do dashboard');
  }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---

app.listen(port, () => {
  console.log(`Servidor da API rodando na porta ${port}`);
});