// index.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Usa a porta definida pelo ambiente ou 3000

// Uma rota de teste
app.get('/', (req, res) => {
  res.send('Olá, mundo! Minha API está funcionando.');
});

app.listen(port, () => {
  console.log(`Servidor da API rodando na porta ${port}`);
});