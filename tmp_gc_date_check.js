
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const body = JSON.stringify({ gc_cliente_id: '40298397' });
fetch(`${url}/functions/v1/gc-buscar-historico-cliente`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` },
  body,
}).then(async (res) => {
  const json = await res.json();
  const oss = json?.ordens_servicos || [];
  console.log(JSON.stringify(oss.slice(0,3).map(os => ({ id: os.id, codigo: os.codigo, data: os.data, data_entrada: os.data_entrada, data_saida: os.data_saida, created_at: os.created_at })), null, 2));
}).catch(err => { console.error(err); process.exit(1); });
