const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Headers de CORS - permite o portal chamar este servidor
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Chama a API do Claude com o andamento e devolve a explicação
function explicarComClaude(processo) {
  return new Promise((resolve, reject) => {
    if (!ANTHROPIC_API_KEY) {
      return reject(new Error('ANTHROPIC_API_KEY nao configurada'));
    }

    const prompt = `Voce e um assistente que explica processos judiciais para clientes leigos, em portugues do Brasil, em linguagem de WhatsApp - simples, calorosa, sem juridiques.

Dados do processo:
- Numero: ${processo.numero || 'nao informado'}
- Tipo: ${processo.tipo || 'nao informado'}
- Tribunal: ${processo.tribunal || 'nao informado'}
- Ultimo andamento: ${processo.ultimo_andamento || 'sem informacao'}

Escreva uma explicacao curta (3 a 5 frases) com:
1. O que esta acontecendo agora no processo, em palavras simples
2. O que isso significa para o cliente
3. O que vem depois (se for possivel saber)

Nao use termos como "intimacao", "conclusos", "juntada". Substitua por linguagem do dia a dia. Seja direto e tranquilizador.`;

    const body = JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.content && json.content[0] && json.content[0].text) {
            resolve(json.content[0].text);
          } else {
            reject(new Error('Resposta inesperada da Anthropic: ' + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Le o body de uma requisicao POST
function lerBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  // Rota de saude - testa se o servidor esta vivo
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'ok',
        servidor: 'ATENDJUS',
        chave_configurada: !!ANTHROPIC_API_KEY,
      })
    );
  }

  // Rota de explicacao
  if (req.method === 'POST' && req.url === '/explicar') {
    try {
      const body = await lerBody(req);
      const explicacao = await explicarComClaude(body);
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ explicacao }));
    } catch (e) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ erro: e.message }));
    }
  }

  res.writeHead(404, corsHeaders);
  res.end();
});

server.listen(PORT, () => {
  console.log(`ATENDJUS servidor rodando na porta ${PORT}`);
  console.log(`Chave da Anthropic configurada: ${!!ANTHROPIC_API_KEY}`);
});
