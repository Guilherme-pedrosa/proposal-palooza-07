"""
ENRIQUECEDOR DE PROSPECTS — Empresas + Simples + Municípios
Roda DEPOIS dos 10 jobs de Estabelecimentos.
Busca razão social, porte, capital, regime fiscal e cidade.
Uso: python enriquecer_prospects.py [url_base]
"""
import os, sys, csv, io, zipfile, requests, time, tempfile
from datetime import datetime

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
BATCH_SIZE = 500

PORTE_MAP = {'00': 'Não informado', '01': 'Micro Empresa', '03': 'Empresa de Pequeno Porte', '05': 'Demais'}
RF_MIRROR_URL = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def supabase_get_cnpjs():
    """Busca todos os cnpj_basico (8 primeiros dígitos) únicos dos prospects."""
    log("Buscando CNPJs dos prospects existentes...")
    cnpjs = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/prospects_rf?select=cnpj&offset={offset}&limit={limit}"
        headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code != 200:
            log(f"  Erro {r.status_code}")
            break
        data = r.json()
        if not data:
            break
        for row in data:
            cnpj = row.get('cnpj', '')
            if len(cnpj) >= 8:
                cnpjs.add(cnpj[:8])
        offset += limit
        if len(data) < limit:
            break
    log(f"  {len(cnpjs):,} CNPJs básicos únicos encontrados")
    return cnpjs

def supabase_patch_batch(updates):
    """Atualiza prospects em batch via PATCH individual (por cnpj)."""
    ok = 0
    err = 0
    for cnpj, data in updates:
        url = f"{SUPABASE_URL}/rest/v1/prospects_rf?cnpj=like.{cnpj}*"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        }
        try:
            r = requests.patch(url, json=data, headers=headers, timeout=15)
            if r.status_code in (200, 204):
                ok += 1
            else:
                err += 1
        except:
            err += 1
        time.sleep(0.02)
    return ok, err

def supabase_rpc(fn_name):
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn_name}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    r = requests.post(url, json={}, headers=headers, timeout=60)
    return r.status_code in (200, 204)

def baixar_streaming(url):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    with requests.get(url, stream=True, timeout=1800, headers={'User-Agent': 'WeDo-CRM/1.0'}) as r:
        r.raise_for_status()
        for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):
            tmp.write(chunk)
    tmp.close()
    return tmp.name

def descobrir_url_base():
    agora = datetime.now()
    for dm in range(0, 4):
        m = agora.month - dm
        a = agora.year
        if m <= 0:
            m += 12
            a -= 1
        for dia in [16, 15, 14, 13, 12, 11, 20, 19, 18, 17, 23, 24, 25, 10, 27]:
            url = f"{RF_MIRROR_URL}/{a}-{m:02d}-{dia:02d}"
            try:
                r = requests.head(f"{url}/Estabelecimentos0.zip", timeout=15, headers={'User-Agent': 'WeDo-CRM/1.0'})
                if r.status_code == 200:
                    return url
            except:
                continue
    sys.exit(1)

def main():
    url_base = sys.argv[1] if len(sys.argv) > 1 else descobrir_url_base()
    log(f"URL base: {url_base}")

    cnpjs_alvo = supabase_get_cnpjs()
    if not cnpjs_alvo:
        log("Nenhum prospect encontrado. Abortando.")
        sys.exit(1)

    # --- MUNICÍPIOS ---
    log("\n=== MUNICÍPIOS ===")
    municipios = {}
    try:
        tmp = baixar_streaming(f"{url_base}/Municipios.zip")
        with zipfile.ZipFile(tmp) as zf:
            with zf.open(zf.namelist()[0]) as f:
                reader = csv.reader(io.TextIOWrapper(f, encoding='latin-1'), delimiter=';')
                for row in reader:
                    if len(row) >= 2:
                        municipios[row[0].strip()] = row[1].strip()
        os.unlink(tmp)
        log(f"  {len(municipios):,} municípios")
    except Exception as e:
        log(f"  Erro municípios: {e}")

    # --- EMPRESAS (razão social, porte, capital) ---
    log("\n=== EMPRESAS ===")
    updates_empresa = []
    for i in range(10):
        log(f"  Empresas{i}.zip...")
        try:
            tmp = baixar_streaming(f"{url_base}/Empresas{i}.zip")
            with zipfile.ZipFile(tmp) as zf:
                with zf.open(zf.namelist()[0]) as f:
                    reader = csv.reader(io.TextIOWrapper(f, encoding='latin-1'), delimiter=';')
                    for row in reader:
                        if len(row) < 6:
                            continue
                        cb = row[0].strip().zfill(8)
                        if cb not in cnpjs_alvo:
                            continue
                        capital = 0
                        try:
                            capital = float(row[4].strip().replace(',', '.')) if row[4].strip() else 0
                        except:
                            pass
                        updates_empresa.append((cb, {
                            'razao_social': row[1].strip(),
                            'natureza_juridica': row[2].strip(),
                            'capital_social': capital,
                            'porte': PORTE_MAP.get(row[5].strip(), row[5].strip()),
                        }))
            os.unlink(tmp)
            log(f"    {len(updates_empresa):,} acumulados")
        except Exception as e:
            log(f"    Erro: {e}")

    # --- SIMPLES NACIONAL ---
    log("\n=== SIMPLES NACIONAL ===")
    updates_simples = []
    try:
        tmp = baixar_streaming(f"{url_base}/Simples.zip")
        with zipfile.ZipFile(tmp) as zf:
            with zf.open(zf.namelist()[0]) as f:
                reader = csv.reader(io.TextIOWrapper(f, encoding='latin-1'), delimiter=';')
                for row in reader:
                    if len(row) < 5:
                        continue
                    cb = row[0].strip().zfill(8)
                    if cb not in cnpjs_alvo:
                        continue
                    mei = row[4].strip() if len(row) > 4 else ''
                    simples = row[1].strip()
                    if mei == 'S':
                        regime = 'MEI'
                    elif simples == 'S':
                        regime = 'Simples Nacional'
                    else:
                        regime = 'Lucro Presumido/Real'
                    updates_simples.append((cb, {'regime_fiscal': regime}))
        os.unlink(tmp)
        log(f"  {len(updates_simples):,} registros Simples")
    except Exception as e:
        log(f"  Erro Simples: {e}")

    # --- APLICAR UPDATES VIA UPSERT (mais eficiente que PATCH) ---
    log("\n=== APLICANDO UPDATES ===")

    # Agrupar por cnpj_basico
    merged = {}
    for cb, data in updates_empresa:
        merged[cb] = data
    for cb, data in updates_simples:
        if cb in merged:
            merged[cb].update(data)
        else:
            merged[cb] = data

    log(f"  {len(merged):,} CNPJs básicos para atualizar")

    # Fazer PATCH em batches
    total_ok = 0
    total_err = 0
    items = list(merged.items())
    for i in range(0, len(items), 100):
        batch = items[i:i+100]
        ok, err = supabase_patch_batch(batch)
        total_ok += ok
        total_err += err
        if (i // 100) % 50 == 0:
            log(f"    Progresso: {total_ok:,} ok, {total_err:,} erros")

    log(f"  Updates: {total_ok:,} ok, {total_err:,} erros")

    # --- PÓS-PROCESSAMENTO ---
    log("\n=== PÓS-PROCESSAMENTO ===")
    log("  Marcando prospects que já são clientes...")
    supabase_rpc('marcar_prospects_clientes')
    log("  Atualizando segmentos dos clientes...")
    supabase_rpc('atualizar_segmentos_clientes')

    log("\n✅ ENRIQUECIMENTO CONCLUÍDO")

if __name__ == '__main__':
    main()
