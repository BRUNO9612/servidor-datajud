const https = require('https');
const http = require('http');

const API_KEY = "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const PORT = process.env.PORT || 3000;

function consultarTribunal(nome, tribunal) {
  return new Promise((resolve) => {
    const query = JSON.stringify({
      query: {
        match: {
          "partes.nome": {
            query: nome,
            operator: "and",
            fuzziness: "AUTO"
          }
        }
      },
      size: 10,
      sort: [{ "dataAjuizamento": { order: "desc" } }]
    });

    const options = {
      hostname: 'api-publica.datajud.cnj.jus.br',
      path: `/${tribunal}/_search`,
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(query)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const hits = json?.hits?.hits || [];
          resolve(hits.map(h => ({ ...h._source, _id: h._id })));
        } catch { resolve([]); }
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.write(query);
    req.end();
  });
}

const TRIBUNAIS = [
  "api_publica_tjac","api_publica_tjal","api_publica_tjam","api_publica_tjap",
  "api_publica_tjba","api_publica_tjce","api_publica_tjdft","api_publica_tjes",
  "api_publica_tjgo","api_publica_tjma","api_publica_tjmg","api_publica_tjms",
  "api_publica_tjmt","api_publica_tjpa","api_publica_tjpb","api_publica_tjpe",
  "api_publica_tjpi","api_publica_tjpr","api_publica_tjrj","api_publica_tjrn",
  "api_publica_tjro","api_publica_tjrr","api_publica_tjrs","api_publica_tjsc",
  "api_publica_tjse","api_publica_tjsp","api_publica_tjto",
  "api_publica_trf1","api_publica_trf2","api_publica_trf3",
  "api_publica_trf4","api_publica_trf5","api_publica_trf6",
  "api_publica_trt1","api_publica_trt2","api_publica_trt3","api_publica_trt4",
  "api_publica_trt5","api_publica_trt6","api_publica_trt7","api_publica_trt8",
  "api_publica_trt9","api_publica_trt10","api_publica_trt11","api_publica_trt12",
  "api_publica_trt13","api_publica_trt14","api_publica_trt15","api_publica_trt16",
  "api_publica_trt17","api_publica_trt18","api_publica_trt19","api_publica_trt20",
  "api_publica_trt21","api_publica_trt22","api_publica_trt23","api_publica_trt24",
  "api_publica_stj","api_publica_tst"
];

const NOMES_TRIBUNAIS = {
  "api_publica_tjac":"TJAC","api_publica_tjal":"TJAL","api_publica_tjam":"TJAM",
  "api_publica_tjap":"TJAP","api_publica_tjba":"TJBA","api_publica_tjce":"TJCE",
  "api_publica_tjdft":"TJDFT","api_publica_tjes":"TJES","api_publica_tjgo":"TJGO",
  "api_publica_tjma":"TJMA","api_publica_tjmg":"TJMG","api_publica_tjms":"TJMS",
  "api_publica_tjmt":"TJMT","api_publica_tjpa":"TJPA","api_publica_tjpb":"TJPB",
  "api_publica_tjpe":"TJPE","api_publica_tjpi":"TJPI","api_publica_tjpr":"TJPR",
  "api_publica_tjrj":"TJRJ","api_publica_tjrn":"TJRN","api_publica_tjro":"TJRO",
  "api_publica_tjrr":"TJRR","api_publica_tjrs":"TJRS","api_publica_tjsc":"TJSC",
  "api_publica_tjse":"TJSE","api_publica_tjsp":"TJSP","api_publica_tjto":"TJTO",
  "api_publica_trf1":"TRF1","api_publica_trf2":"TRF2","api_publica_trf3":"TRF3",
  "api_publica_trf4":"TRF4","api_publica_trf5":"TRF5","api_publica_trf6":"TRF6",
  "api_publica_trt1":"TRT1","api_publica_trt2":"TRT2","api_publica_trt3":"TRT3",
  "api_publica_trt4":"TRT4","api_publica_trt5":"TRT5","api_publica_trt6":"TRT6",
  "api_publica_trt7":"TRT7","api_publica_trt8":"TRT8","api_publica_trt9":"TRT9",
  "api_publica_trt10":"TRT10","api_publica_trt11":"TRT11","api_publica_trt12":"TRT12",
  "api_publica_trt13":"TRT13","api_publica_trt14":"TRT14","api_publica_trt15":"TRT15",
  "api_publica_trt16":"TRT16","api_publica_trt17":"TRT17","api_publica_trt18":"TRT18",
  "api_publica_trt19":"TRT19","api_publica_trt20":"TRT20","api_publica_trt21":"TRT21",
  "api_publica_trt22":"TRT22","api_publica_trt23":"TRT23","api_publica_trt24":"TRT24",
  "api_publica_stj":"STJ","api_publica_tst":"TST"
};

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
    res.end(JSON.stringify({ status: 'ok', message: 'Servidor DataJud - Moisés & Cirino' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/buscar') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { nome } = JSON.parse(body);
        if (!nome || nome.trim().length < 3) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Nome inválido' }));
          return;
        }

        // Busca em todos os tribunais em paralelo
        const promises = TRIBUNAIS.map(async (tribunal) => {
          const processos = await consultarTribunal(nome, tribunal);
          return processos.map(p => ({ ...p, _tribunal: NOMES_TRIBUNAIS[tribunal] || tribunal }));
        });

        const resultados = await Promise.all(promises);
        const todos = resultados.flat();

        // Filtra pelo primeiro nome
        const primeiroNome = nome.trim().split(' ')[0].toLowerCase();
        const filtrados = todos.filter(p => {
          const partes = p.partes || [];
          return partes.some(pa => pa.nome && pa.nome.toLowerCase().includes(primeiroNome));
        });

        res.writeHead(200);
        res.end(JSON.stringify({ processos: filtrados, total: filtrados.length }));

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
