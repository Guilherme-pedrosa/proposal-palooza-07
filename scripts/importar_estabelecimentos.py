"""
IMPORTADOR RECEITA FEDERAL — ESTABELECIMENTOS (1 arquivo por vez)
Baixa Estabelecimentos{N}.zip via streaming, filtra CNAEs, faz upsert.
Uso: python importar_estabelecimentos.py <indice> [url_base]
"""
import sys, csv, io, zipfile, requests, time, tempfile, os
from datetime import datetime
from rf_supabase import carregar_config_supabase, validar_config_supabase, resumir_erro_http

SUPABASE_URL, SUPABASE_KEY = carregar_config_supabase()
BATCH_SIZE = 500

CNAES_ALVO = {
    '5611201': 'Restaurantes e similares',
    '5611202': 'Bares e outros estabelecimentos especializados em servir bebidas',
    '5611203': 'Lanchonetes, casas de chá, de sucos e similares',
    '5611204': 'Bares e outros estab. especializados em servir bebidas, sem entretenimento',
    '5611205': 'Bares e outros estab. especializados em servir bebidas, com entretenimento',
    '5612100': 'Serviços ambulantes de alimentação',
    '5620101': 'Fornecimento de alimentos preparados preponderantemente para empresas',
    '5620102': 'Serviços de alimentação para eventos e recepções (buffet)',
    '5620103': 'Cantinas - serviços de alimentação privativos',
    '5620104': 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar',
    '5510801': 'Hotéis',
    '5510802': 'Apart-hotéis',
    '5510803': 'Motéis',
    '5590601': 'Albergues, exceto assistenciais',
    '5590602': 'Campings',
    '5590603': 'Pensões (alojamento)',
    '5590699': 'Outros alojamentos não especificados anteriormente',
    '8610101': 'Atividades de atendimento hospitalar (exceto pronto-socorro e UTI)',
    '8610102': 'Atividades de atendimento em pronto-socorro e UTI',
    '8611801': 'Hospitais gerais, exceto com internação',
    '8630501': 'Atividade médica ambulatorial com recursos para realização de procedimentos',
    '1091101': 'Fabricação de produtos de panificação industrial',
    '1091102': 'Fabricação de produtos de padaria e confeitaria com predominância de produção própria',
    '4721102': 'Padaria e confeitaria com predominância de revenda',
    '5629801': 'Serviços de alimentação em estabelecimentos de ensino e saúde',
}

SITUACAO_ATIVA = '02'
SITUACAO_MAP = {'01': 'Nula', '02': 'Ativa', '03': 'Suspensa', '04': 'Inapta', '08': 'Baixada'}
RF_MIRROR_URL = 'https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos'

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def supabase_post(data):
    url = f"{SUPABASE_URL}/rest/v1/prospects_rf"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    for tentativa in range(3):
        try:
            resp = requests.post(url, json=data, headers=headers, timeout=30)
            if resp.status_code in (200, 201, 204):
                return True
            if resp.status_code == 429:
                log(f"  Rate limit, esperando 5s...")
                time.sleep(5)
                continue
            log(f"  {resumir_erro_http(resp, 'POST prospects_rf')}")
            if tentativa < 2:
                time.sleep(2)
                continue
            return False
        except Exception as e:
            log(f"  Exceção: {e}")
            if tentativa < 2:
                time.sleep(2)
                continue
            return False
    return False

def formatar_telefone(ddd, telefone):
    ddd = (ddd or '').strip()
    tel = (telefone or '').strip()
    if ddd and tel:
        return f"({ddd}) {tel}"
    return tel or ''

def limpar_cnpj(b, o, d):
    return f"{b.zfill(8)}{o.zfill(4)}{d.zfill(2)}"

def descobrir_url_base():
    agora = datetime.now()
    datas = []
    for dm in range(0, 4):
        m = agora.month - dm
        a = agora.year
        if m <= 0:
            m += 12
            a -= 1
        for dia in [16, 15, 14, 13, 12, 11, 20, 19, 18, 17, 23, 24, 25, 10, 27]:
            datas.append(f"{a}-{m:02d}-{dia:02d}")
    for d in datas:
        url = f"{RF_MIRROR_URL}/{d}"
        try:
            r = requests.head(f"{url}/Estabelecimentos0.zip", timeout=15,
                            headers={'User-Agent': 'WeDo-CRM/1.0'})
            if r.status_code == 200:
                log(f"URL base: {url}")
                return url
        except:
            continue
    log("ERRO: nenhuma URL encontrada")
    sys.exit(1)

def main():
    validar_config_supabase(SUPABASE_URL, SUPABASE_KEY)
    indice = int(sys.argv[1])
    url_base = sys.argv[2] if len(sys.argv) > 2 else descobrir_url_base()

    nome_zip = f"Estabelecimentos{indice}.zip"
    url = f"{url_base}/{nome_zip}"

    log(f"=== ESTABELECIMENTOS {indice} ===")
    log(f"Baixando {url} via streaming...")

    # Streaming download para disco (não carrega na RAM)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    tmp_path = tmp.name
    try:
        with requests.get(url, stream=True, timeout=1800,
                         headers={'User-Agent': 'WeDo-CRM/1.0'}) as r:
            r.raise_for_status()
            total = int(r.headers.get('content-length', 0))
            downloaded = 0
            for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):  # 8MB chunks
                tmp.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    if downloaded % (50 * 1024 * 1024) < 8 * 1024 * 1024:
                        log(f"  Download: {downloaded / 1024 / 1024:.0f}MB / {total / 1024 / 1024:.0f}MB ({pct:.0f}%)")
        tmp.close()
        log(f"  Download completo: {downloaded / 1024 / 1024:.0f}MB")

        # Processar ZIP → CSV linha a linha
        batch = []
        total_linhas = 0
        total_filtrados = 0
        total_inseridos = 0
        total_erros = 0

        with zipfile.ZipFile(tmp_path) as zf:
            csv_name = zf.namelist()[0]
            log(f"  Processando {csv_name}...")
            with zf.open(csv_name) as f:
                text_stream = io.TextIOWrapper(f, encoding='latin-1')
                reader = csv.reader(text_stream, delimiter=';', quotechar='"')
                for row in reader:
                    total_linhas += 1
                    if len(row) < 28:
                        continue
                    cnae = row[11].strip()
                    situacao = row[5].strip()
                    if cnae not in CNAES_ALVO or situacao != SITUACAO_ATIVA:
                        continue
                    total_filtrados += 1

                    cnpj = limpar_cnpj(row[0], row[1], row[2])
                    partes = [row[13].strip(), row[14].strip(), row[15].strip()]
                    endereco = ' '.join(p for p in partes if p)

                    batch.append({
                        'cnpj': cnpj,
                        'nome_fantasia': row[4].strip() or None,
                        'situacao_cadastral': SITUACAO_MAP.get(situacao, situacao),
                        'data_inicio_atividade': row[10].strip() or None,
                        'cnae_codigo': cnae,
                        'cnae_descricao': CNAES_ALVO.get(cnae, ''),
                        'logradouro': row[14].strip() or None,
                        'numero': row[15].strip() or None,
                        'complemento': row[16].strip() or None,
                        'bairro': row[17].strip() or None,
                        'cep': row[18].strip() or None,
                        'uf': row[19].strip() or None,
                        'telefone_1': formatar_telefone(row[21], row[22]),
                        'telefone_2': formatar_telefone(row[23], row[24]),
                        'email': row[27].strip().lower() or None,
                        'endereco_completo': endereco,
                        'fonte': 'receita_federal',
                        'atualizado_em': datetime.now().isoformat(),
                    })

                    if len(batch) >= BATCH_SIZE:
                        ok = supabase_post(batch)
                        if ok:
                            total_inseridos += len(batch)
                        else:
                            total_erros += len(batch)
                        batch = []
                        if total_filtrados % 5000 < BATCH_SIZE:
                            log(f"  Progresso: {total_linhas:,} linhas | {total_filtrados:,} filtrados | {total_inseridos:,} inseridos")
                        time.sleep(0.05)

        # Flush restante
        if batch:
            ok = supabase_post(batch)
            if ok:
                total_inseridos += len(batch)
            else:
                total_erros += len(batch)

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    log(f"\n=== RESULTADO Estabelecimentos{indice} ===")
    log(f"Linhas processadas: {total_linhas:,}")
    log(f"Filtrados (CNAE+Ativa): {total_filtrados:,}")
    log(f"Inseridos no Supabase: {total_inseridos:,}")
    log(f"Erros: {total_erros:,}")

if __name__ == '__main__':
    main()
