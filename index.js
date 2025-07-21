// index.js
require('dotenv').config(); // Carrega as variáveis de ambiente do .env local (se existir)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Pool de Conexão com o Postgres
// Ele vai usar automaticamente a variável de ambiente DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middlewares
app.use(cors()); // Permite que seu frontend em outro domínio acesse a API
app.use(express.json()); // Permite que a API entenda requisições com corpo em JSON

// Rota de teste para verificar a conexão com o banco de dados
app.get('/', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.send(`Olá, mundo! A API está funcionando. Hora do banco de dados: ${time.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao conectar ao banco de dados');
  }
});

// index.js (continuação)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ROTA PARA CRIAR UM NOVO USUÁRIO (para podermos testar o login)
app.post('/usuarios', async (req, res) => {
  const { empresa_id, email, senha, nome_usuario } = req.body;
  
  if (!empresa_id || !email || !senha) {
    return res.status(400).send('empresa_id, email e senha são obrigatórios');
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10); // Criptografa a senha
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


// ROTA DE LOGIN
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

    // Gera o Token JWT
    const token = jwt.sign(
      { usuario_id: usuario.id, empresa_id: usuario.empresa_id },
      process.env.JWT_SECRET, // Um segredo que você vai criar
      { expiresIn: '8h' }
    );
    
    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro no servidor');
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor da API rodando na porta ${port}`);
});