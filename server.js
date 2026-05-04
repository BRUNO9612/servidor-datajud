const https = require('https');
const http = require('http');
const PORT = process.env.PORT || 3000;

const API_KEY = "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// Mapa tribunal pelo código CNJ
const TRIBUNAL_MAP = {
  '801': 'api_publica_tjac', '802': 'api_publica_tjal', '803': 'api_publica_tjam',
  '804': 'api_publica_tjap', '805': 'api_publica_tjba', '806': 'api_publica_tjce',
  '807': 'api_publica_tjdft', '808': 'api_publica_tjes', '809': 'api_publica_tjgo',
  '810': 'api_publica_tjma', '811': 'api_publica_tjmg', '812': 'api_publica_tjms',
  '813': 'api_publica_tjmt', '814': 'api_publica_tjpa', '815': 'api_publica_tjpb',
  '816': 'api_publica_tjpe', '817': 'api_publica_tjpi', '818': 'api_publica_tjpr',
  '819': 'api_publica_tjrj', '820': 'api_publica_tjrn', '821': 'api_publica_tjro',
  '822': 'api_publica_tjrr', '823': 'api_publica_tjrs', '824': 'api_publica_tjsc',
  '825': 'api_publica_tjse', '826': 'api_publica_tjsp', '827': 'api_publica_tjto',
  '401': 'api_publica_trf1', '402': 'api_publica_trf2', '403': 'api_publica_trf3',
  '404': 'api_publica_trf4', '405': 'api_publica_trf5', '406': 'api_publica_trf6',
  '501': 'api_publica_trt1', '502': 'api_publica_trt2', '503': 'api_publica_trt3',
  '504': 'api_publica_trt4', '505': 'api_publica_trt5', '506': 'api_publica_trt6',
  '507': 'api_publica_trt7', '508': 'api_publica_trt8', '509': 'api_publica_trt9',
  '510': 'api_publica_trt10', '511': 'api_publica_trt11', '512': 'api_publica_trt12',
  '513': 'api_publica_trt13', '514': 'api_publica_trt14', '515': 'api_publica_trt15',
  '516': 'api_publica_trt16', '517': 'api_publica_trt17', '518': 'api_publica_trt18',
  '519': 'api_publica_trt19', '520': 'api_publica_trt20', '521': 'api_publica_trt21',
  '522': 'api_publica_trt22', '523': 'api_publica_trt23', '524': 'api_publica_trt24',
  '600': 'api_publica_stj', '900': 'api_publica_stf', '500': 'api_publica_tst'
};

function getTribunal(numero) {
  // Número CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
  const limpo = numero.replace(/\D/g, '');
  if (limpo.length !== 20) return null;
  const j = limpo[13]; // Segmento de justiça
  const tt = limpo.substring(14, 16); // Tribunal
  const key = j + tt;
  return TRIBUNAL_MAP[key] || null;
}

function fazerRequisicao(tribunal, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(query);
    const options = {
      hostname: 'api-publica.datajud.cnj.jus.br',
      path: `/${tribunal}/_search`,
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Resposta inválida')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'Servidor DataJud - Portal Jurídico' }));
    return;
  }

  // BUSCAR POR NÚMERO DO PROCESSO
  if (req.method === 'POST' && req.url === '/processo') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { numero } = JSON.parse(body);
        if (!numero) { res.writeHead(400); res.end(JSON.stringify({ error: 'Número obrigatório' })); return; }

        const tribunal = getTribunal(numero);
        if (!tribunal) {
          res.writeHead(200);
          res.end(JSON.stringify({ processo: null, error: 'Tribunal não identificado' }));
          return;
        }

        const query = {
          query: { match: { "numeroProcesso": numero.replace(/\D/g,'') } },
          size: 1
        };

        const result = await fazerRequisicao(tribunal, query);
        const hit = result?.hits?.hits?.[0];

        if (!hit) {
          // Tentar busca alternativa com número formatado
          const query2 = {
            query: { term: { "numero": numero } },
            size: 1
          };
          const result2 = await fazerRequisicao(tribunal, query2);
          const hit2 = result2?.hits?.hits?.[0];
          
          res.writeHead(200);
          res.end(JSON.stringify({ processo: hit2?._source || null, tribunal }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({ processo: hit._source, tribunal }));

      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
