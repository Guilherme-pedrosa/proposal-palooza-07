"""
ENRIQUECEDOR DE PROSPECTS — Empresas + Simples + Municípios + Sócios
Roda DEPOIS dos 10 jobs de Estabelecimentos.
Busca razão social, porte, capital, regime fiscal, cidade e sócios/contato.
Uso: python enriquecer_prospects.py [url_base]
"""
import sys, csv, io, zipfile, requests, time, tempfile, json
from datetime import datetime
from rf_supabase import carregar_config_supabase, validar_config_supabase, resumir_erro_http


SUPABASE_URL, SUPABASE_KEY = carregar_config_supabase()
BATCH_SIZE = 500

PORTE_MAP = {'00': 'Não informado', '01': 'Micro Empresa', '03': 'Empresa de Pequeno Porte', '05': 'Demais'}
QUALIFICACAO_MAP = {
    '05': 'Administrador', '08': 'Conselheiro de Administração', '10': 'Diretor',
    '16': 'Presidente', '22': 'Sócio', '28': 'Sócio-Administrador',
    '29': 'Sócio-Gerente', '49': 'Sócio-Quotista', '50': 'Empresário',
    '54': 'Fundador', '55': 'Sócio Comanditado', '56': 'Sócio Comanditário',
    '63': 'Titular Pessoa Física Residente no Brasil',
}
RF_MIRROR_URL = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def validar_config():
    validar_config_supabase(SUPABASE_URL, SUPABASE_KEY)


def supabase_patch_batch(updates):
    """Atualiza prospects em batch via PATCH individual (por cnpj_basico)."""
    ok = err = 0
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


def supabase_get_cnpjs():
    """Busca todos os cnpj_basico (8 primeiros dígitos) únicos dos prospects."""
    log("Buscando CNPJs dos prospects existentes...")
    cnpjs = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/prospects_rf?select=cnpj&offset={offset}&limit={limit}"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Prefer': 'count=exact',
        }
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code != 200:
            raise RuntimeError(resumir_erro_http(r, 'GET prospects_rf para enrichment'))
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
    if not cnpjs:
        total_header = r.headers.get('Content-Range', '') if 'r' in locals() else ''
        if total_header:
            log(f"  Content-Range recebido: {total_header}")
        log(
            "  Nenhum CNPJ visível para enrichment. Se a importação acabou de rodar, "
            "o workflow provavelmente está apontando para outro projeto ou usando uma chave incorreta."
        )
    log(f"  {len(cnpjs):,} CNPJs básicos únicos encontrados")
    return cnpjs


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


# ─── PROCESSADORES ────────────────────────────────────────

def processar_empresas(url_base, cnpjs_alvo):
    """Baixa Empresas0-9.zip e extrai razão social, porte, capital."""
    log("\n=== EMPRESAS ===")
    updates = []
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
                        updates.append((cb, {
                            'razao_social': row[1].strip(),
                            'natureza_juridica': row[2].strip(),
                            'capital_social': capital,
                            'porte': PORTE_MAP.get(row[5].strip(), row[5].strip()),
                        }))
            os.unlink(tmp)
            log(f"    {len(updates):,} acumulados")
        except Exception as e:
            log(f"    Erro: {e}")
    return updates


def processar_simples(url_base, cnpjs_alvo):
    """Baixa Simples.zip e extrai regime fiscal."""
    log("\n=== SIMPLES NACIONAL ===")
    updates = []
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
                    updates.append((cb, {'regime_fiscal': regime}))
        os.unlink(tmp)
        log(f"  {len(updates):,} registros Simples")
    except Exception as e:
        log(f"  Erro Simples: {e}")
    return updates


def processar_socios(url_base, cnpjs_alvo):
    """Baixa Socios0-9.zip e extrai nome, qualificação e CPF parcial dos sócios."""
    log("\n=== SÓCIOS ===")
    # Agrupa sócios por cnpj_basico
    socios_por_cnpj = {}
    for i in range(10):
        log(f"  Socios{i}.zip...")
        try:
            tmp = baixar_streaming(f"{url_base}/Socios{i}.zip")
            with zipfile.ZipFile(tmp) as zf:
                with zf.open(zf.namelist()[0]) as f:
                    reader = csv.reader(io.TextIOWrapper(f, encoding='latin-1'), delimiter=';')
                    for row in reader:
                        if len(row) < 6:
                            continue
                        cb = row[0].strip().zfill(8)
                        if cb not in cnpjs_alvo:
                            continue
                        nome_socio = row[2].strip()
                        qualif_cod = row[4].strip() if len(row) > 4 else ''
                        qualif = QUALIFICACAO_MAP.get(qualif_cod, qualif_cod)
                        # CPF representante (parcial, últimos chars visíveis na RF)
                        cpf_repr = row[3].strip() if len(row) > 3 else ''

                        socio = {
                            'nome': nome_socio,
                            'qualificacao': qualif,
                        }
                        if cpf_repr and cpf_repr != '000000000000':
                            socio['cpf_cnpj'] = cpf_repr

                        if cb not in socios_por_cnpj:
                            socios_por_cnpj[cb] = []
                        # Limitar a 10 sócios por empresa
                        if len(socios_por_cnpj[cb]) < 10:
                            socios_por_cnpj[cb].append(socio)
            os.unlink(tmp)
            log(f"    {len(socios_por_cnpj):,} empresas com sócios")
        except Exception as e:
            log(f"    Erro: {e}")

    # Converter para updates com contato_principal
    updates = []
    for cb, socios in socios_por_cnpj.items():
        # Contato principal = primeiro administrador/sócio-administrador
        contato = None
        for s in socios:
            if s['qualificacao'] in ('Administrador', 'Sócio-Administrador', 'Sócio-Gerente', 'Titular Pessoa Física Residente no Brasil'):
                contato = s['nome']
                break
        if not contato and socios:
            contato = socios[0]['nome']

        data = {'socios': json.dumps(socios, ensure_ascii=False)}
        if contato:
            data['contato_principal'] = contato
        updates.append((cb, data))

    log(f"  {len(updates):,} CNPJs com sócios para atualizar")
    return updates


def processar_municipios(url_base):
    """Baixa Municipios.zip para mapeamento código→nome."""
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
    return municipios


# ─── MAIN ─────────────────────────────────────────────────

def main():
    validar_config()
    url_base = sys.argv[1] if len(sys.argv) > 1 else descobrir_url_base()
    log(f"URL base: {url_base}")

    cnpjs_alvo = supabase_get_cnpjs()
    if not cnpjs_alvo:
        log("Nenhum prospect encontrado. Abortando.")
        sys.exit(1)

    # Processar todas as fontes
    municipios = processar_municipios(url_base)
    updates_empresa = processar_empresas(url_base, cnpjs_alvo)
    updates_simples = processar_simples(url_base, cnpjs_alvo)
    updates_socios = processar_socios(url_base, cnpjs_alvo)

    # Agrupar por cnpj_basico
    log("\n=== APLICANDO UPDATES ===")
    merged = {}
    for cb, data in updates_empresa:
        merged[cb] = data
    for cb, data in updates_simples:
        merged.setdefault(cb, {}).update(data)
    for cb, data in updates_socios:
        merged.setdefault(cb, {}).update(data)

    log(f"  {len(merged):,} CNPJs básicos para atualizar")

    # PATCH em batches
    total_ok = total_err = 0
    items = list(merged.items())
    for i in range(0, len(items), 100):
        batch = items[i:i + 100]
        ok, err = supabase_patch_batch(batch)
        total_ok += ok
        total_err += err
        if (i // 100) % 50 == 0:
            log(f"    Progresso: {total_ok:,} ok, {total_err:,} erros")

    log(f"  Updates: {total_ok:,} ok, {total_err:,} erros")

    # Pós-processamento
    log("\n=== PÓS-PROCESSAMENTO ===")
    log("  Marcando prospects que já são clientes...")
    supabase_rpc('marcar_prospects_clientes')
    log("  Atualizando segmentos dos clientes...")
    supabase_rpc('atualizar_segmentos_clientes')

    log("\n✅ ENRIQUECIMENTO CONCLUÍDO")


if __name__ == '__main__':
    main()
