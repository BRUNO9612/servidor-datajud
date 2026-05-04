const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3000;

function buscarJusBrasil(cpf) {
  return new Promise((resolve, reject) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const path = `/consulta-processual/?cpf=${cpfLimpo}`;

    const options = {
      hostname: 'www.jusbrasil.com.br',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    };

    const req = https.request(options, (res) => {
      // Seguir redirecionamentos
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        resolve({ redirect: location, status: res.statusCode });
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ html: data, status: res.statusCode });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function extrairProcessos(html) {
  const processos = [];

  // Regex para capturar blocos de processo
  const regexNumero = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
  const numeros = [...new Set(html.match(regexNumero) || [])];

  // Regex para capturar tribunal
  const regexTribunal = /TJ[A-Z]{2}|TRF\d|TRT\d{1,2}|STJ|STF|TST/g;
  const tribunais = [...new Set(html.match(regexTribunal) || [])];

  // Extrair títulos de processos (padrão JusBrasil)
  const regexTitulo = /class="[^"]*ProcessCard[^"]*"[^>]*>[\s\S]*?<[^>]*title[^>]*>([^<]+)</gi;
  
  numeros.forEach((numero, i) => {
    processos.push({
      numero: numero,
      tribunal: tribunais[i] || 'Não informado',
      classe: 'Processo Judicial',
      assunto: 'Consulte no portal do tribunal',
      _tribunal: tribunais[i] || 'Tribunal'
    });
  });

  return processos;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'Servidor Moisés & Cirino - Portal do Cliente' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/buscar') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { cpf, nome } = JSON.parse(body);

        if (!cpf) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'CPF obrigatório' }));
          return;
        }

        const cpfLimpo = cpf.replace(/\D/g, '');
        const resultado = await buscarJusBrasil(cpfLimpo);

        if (resultado.redirect) {
          // JusBrasil redirecionou — retorna URL para o frontend abrir
          res.writeHead(200);
          res.end(JSON.stringify({
            processos: [],
            jusbrasil_url: `https://www.jusbrasil.com.br/consulta-processual/?cpf=${cpfLimpo}`,
            total: 0,
            modo: 'redirect'
          }));
          return;
        }

        const html = resultado.html || '';
        const processos = extrairProcessos(html);

        // Se não encontrou processos no HTML, retorna URL do JusBrasil
        if (processos.length === 0) {
          res.writeHead(200);
          res.end(JSON.stringify({
            processos: [],
            jusbrasil_url: `https://www.jusbrasil.com.br/consulta-processual/?cpf=${cpfLimpo}`,
            total: 0,
            modo: 'sem_resultados'
          }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ processos, total: processos.length, modo: 'direto' }));

      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
