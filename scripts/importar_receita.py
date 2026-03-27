"""
IMPORTADOR BASE RECEITA FEDERAL → SUPABASE
WeDo CRM — Prospecção por CNAE + Regime Fiscal

Roda via GitHub Actions 2x/mês (dia 1 e 15, às 23h BRT)
Baixa os CSVs da Receita Federal, filtra CNAEs de food service,
e faz bulk upsert na tabela prospects_rf do Supabase.

Autor: Gerado para WeDo Comércio e Importação Ltda
"""

import os
import sys
import csv
import io
import zipfile
import requests
import time
from datetime import datetime

# ══════════════════════════════════════════════════════════
# CONFIGURAÇÃO
# ══════════════════════════════════════════════════════════

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# CNAEs de interesse WeDo (food service, hospitalidade, alimentação)
CNAES_ALVO = {
    # Restaurantes e alimentação
    '5611201': 'Restaurantes e similares',
    '5611202': 'Bares e outros estabelecimentos especializados em servir bebidas',
    '5611203': 'Lanchonetes, casas de chá, de sucos e similares',
    '5611204': 'Bares e outros estab. especializados em servir bebidas, sem entretenimento',
    '5611205': 'Bares e outros estab. especializados em servir bebidas, com entretenimento',
    '5612100': 'Serviços ambulantes de alimentação',
    # Catering e refeições coletivas
    '5620101': 'Fornecimento de alimentos preparados preponderantemente para empresas',
    '5620102': 'Serviços de alimentação para eventos e recepções (buffet)',
    '5620103': 'Cantinas - serviços de alimentação privativos',
    '5620104': 'Fornecimento de alimentos preparados preponderantemente para consumo domiciliar',
    # Hotéis e hospedagem
    '5510801': 'Hotéis',
    '5510802': 'Apart-hotéis',
    '5510803': 'Motéis',
    '5590601': 'Albergues, exceto assistenciais',
    '5590602': 'Campings',
    '5590603': 'Pensões (alojamento)',
    '5590699': 'Outros alojamentos não especificados anteriormente',
    # Hospitais e saúde
    '8610101': 'Atividades de atendimento hospitalar (exceto pronto-socorro e UTI)',
    '8610102': 'Atividades de atendimento em pronto-socorro e UTI',
    '8611801': 'Hospitais gerais, exceto com internação',
    '8630501': 'Atividade médica ambulatorial com recursos para realização de procedimentos',
    # Panificação e confeitaria
    '1091101': 'Fabricação de produtos de panificação industrial',
    '1091102': 'Fabricação de produtos de padaria e confeitaria com predominância de produção própria',
    '4721102': 'Padaria e confeitaria com predominância de revenda',
    # Alimentação institucional
    '5629801': 'Serviços de alimentação em estabelecimentos de ensino e saúde',
    # Fast food / franquias alimentação
    '5611203': 'Lanchonetes, casas de chá, de sucos e similares',
}

# Situação cadastral: 02 = ATIVA
SITUACAO_ATIVA = '02'

# URL base dos dados abertos da Receita Federal
RF_BASE_URL = 'https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj'

# Batch size para upsert no Supabase
BATCH_SIZE = 500

# ══════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def supabase_request(method, endpoint, data=None, params=None):
    """Faz request para a API REST do Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    
    for tentativa in range(3):
        try:
            if method == 'POST':
                resp = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'GET':
                resp = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'DELETE':
                resp = requests.delete(url, headers=headers, params=params, timeout=30)
            else:
                raise ValueError(f"Método não suportado: {method}")
            
            if resp.status_code in (200, 201, 204):
                return resp
            elif resp.status_code == 429:
                log(f"  Rate limit, esperando 5s...")
                time.sleep(5)
                continue
            else:
                log(f"  Erro Supabase {resp.status_code}: {resp.text[:200]}")
                if tentativa < 2:
                    time.sleep(2)
                    continue
                return resp
        except Exception as e:
            log(f"  Exceção: {e}")
            if tentativa < 2:
                time.sleep(2)
                continue
            raise
    return None

def baixar_e_extrair_csv(url, nome_arquivo_csv):
    """Baixa ZIP da Receita e extrai o CSV."""
    log(f"  Baixando {url}...")
    resp = requests.get(url, stream=True, timeout=300)
    if resp.status_code != 200:
        log(f"  ERRO ao baixar: {resp.status_code}")
        return None
    
    zip_bytes = io.BytesIO(resp.content)
    log(f"  Download concluído: {len(resp.content) / 1024 / 1024:.1f} MB")
    
    with zipfile.ZipFile(zip_bytes) as zf:
        nomes = zf.namelist()
        log(f"  Arquivos no ZIP: {nomes}")
        # Pegar o primeiro CSV
        csv_name = nomes[0] if nomes else None
        if csv_name:
            return zf.read(csv_name).decode('latin-1')
    return None

def limpar_cnpj(cnpj_basico, cnpj_ordem, cnpj_dv):
    """Monta o CNPJ completo a partir dos 3 campos."""
    return f"{cnpj_basico.zfill(8)}{cnpj_ordem.zfill(4)}{cnpj_dv.zfill(2)}"

def formatar_telefone(ddd, telefone):
    """Formata telefone."""
    ddd = (ddd or '').strip()
    tel = (telefone or '').strip()
    if ddd and tel:
        return f"({ddd}) {tel}"
    return tel or ''

# ══════════════════════════════════════════════════════════
# DICIONÁRIOS AUXILIARES (Receita Federal)
# ══════════════════════════════════════════════════════════

QUALIFICACAO_MUNICIPIOS = {}  # Carregado dos CSVs auxiliares
QUALIFICACAO_NATUREZA = {}
QUALIFICACAO_PAISES = {}

REGIME_FISCAL_MAP = {
    '1': 'Simples Nacional',
    '2': 'Simples Nacional - Excedeu sublimite',
    '3': 'Lucro Presumido',
    '5': 'Lucro Real',
    '6': 'Lucro Arbitrado',
    '7': 'MEI',
}

PORTE_MAP = {
    '00': 'Não informado',
    '01': 'Micro Empresa',
    '03': 'Empresa de Pequeno Porte',
    '05': 'Demais',
}

SITUACAO_MAP = {
    '01': 'Nula',
    '02': 'Ativa',
    '03': 'Suspensa',
    '04': 'Inapta',
    '08': 'Baixada',
}

# ══════════════════════════════════════════════════════════
# PASSO 1: DESCOBRIR URLs DOS ARQUIVOS MAIS RECENTES
# ══════════════════════════════════════════════════════════

def descobrir_urls_receita():
    """Descobre as URLs dos arquivos mais recentes da Receita Federal."""
    log("Descobrindo URLs dos arquivos da Receita Federal...")
    
    # A Receita organiza os dados em pastas por mês
    # Formato: https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/YYYY-MM/
    
    # Tentar o mês atual e o anterior
    agora = datetime.now()
    meses_tentar = []
    for delta in range(0, 3):
        mes = agora.month - delta
        ano = agora.year
        if mes <= 0:
            mes += 12
            ano -= 1
        meses_tentar.append(f"{ano}-{mes:02d}")
    
    for mes_ref in meses_tentar:
        url_base = f"{RF_BASE_URL}/{mes_ref}"
        log(f"  Tentando {url_base}...")
        
        try:
            # Verificar se a URL existe
            resp = requests.head(f"{url_base}/Estabelecimentos0.zip", timeout=10)
            if resp.status_code == 200:
                log(f"  ✅ Encontrado: {mes_ref}")
                return url_base, mes_ref
        except:
            continue
    
    # Fallback: URL direta sem subpasta de mês
    url_base = "https://dadosabertos.rfb.gov.br/CNPJ"
    log(f"  Usando URL base: {url_base}")
    return url_base, "atual"

# ══════════════════════════════════════════════════════════
# PASSO 2: PROCESSAR ESTABELECIMENTOS (filtrar por CNAE)
# ══════════════════════════════════════════════════════════

def processar_estabelecimentos(url_base):
    """
    Baixa e processa os arquivos de Estabelecimentos da Receita.
    São 10 arquivos (Estabelecimentos0.zip a Estabelecimentos9.zip).
    Filtra apenas CNAEs de interesse.
    """
    log("=" * 60)
    log("PROCESSANDO ESTABELECIMENTOS")
    log("=" * 60)
    
    todos_prospects = []
    
    for i in range(10):
        nome_zip = f"Estabelecimentos{i}.zip"
        url = f"{url_base}/{nome_zip}"
        
        log(f"\nArquivo {i+1}/10: {nome_zip}")
        
        csv_content = baixar_e_extrair_csv(url, nome_zip)
        if not csv_content:
            log(f"  SKIP: não conseguiu baixar {nome_zip}")
            continue
        
        # Processar CSV
        # Colunas do CSV de Estabelecimentos (sem header, separado por ;):
        # 0: cnpj_basico, 1: cnpj_ordem, 2: cnpj_dv, 3: id_matriz_filial,
        # 4: nome_fantasia, 5: situacao_cadastral, 6: data_situacao,
        # 7: motivo_situacao, 8: nome_cidade_exterior, 9: codigo_pais,
        # 10: data_inicio_atividade, 11: cnae_fiscal, 12: cnae_fiscal_secundario,
        # 13: tipo_logradouro, 14: logradouro, 15: numero, 16: complemento,
        # 17: bairro, 18: cep, 19: uf, 20: codigo_municipio,
        # 21: ddd1, 22: telefone1, 23: ddd2, 24: telefone2,
        # 25: ddd_fax, 26: fax, 27: email, 28: situacao_especial, 29: data_situacao_especial
        
        reader = csv.reader(io.StringIO(csv_content), delimiter=';', quotechar='"')
        count_linhas = 0
        count_filtrados = 0
        
        for row in reader:
            count_linhas += 1
            
            if len(row) < 28:
                continue
            
            cnae = row[11].strip() if len(row) > 11 else ''
            situacao = row[5].strip() if len(row) > 5 else ''
            
            # Filtrar: apenas CNAEs de interesse E situação ATIVA
            if cnae not in CNAES_ALVO:
                continue
            if situacao != SITUACAO_ATIVA:
                continue
            
            count_filtrados += 1
            
            cnpj = limpar_cnpj(row[0], row[1], row[2])
            
            prospect = {
                'cnpj': cnpj,
                'cnpj_basico': row[0].strip().zfill(8),
                'nome_fantasia': row[4].strip() or None,
                'situacao_cadastral': SITUACAO_MAP.get(situacao, situacao),
                'data_inicio_atividade': row[10].strip() or None,
                'cnae_codigo': cnae,
                'cnae_descricao': CNAES_ALVO.get(cnae, ''),
                'tipo_logradouro': row[13].strip() or None,
                'logradouro': row[14].strip() or None,
                'numero': row[15].strip() or None,
                'complemento': row[16].strip() or None,
                'bairro': row[17].strip() or None,
                'cep': row[18].strip() or None,
                'uf': row[19].strip() or None,
                'codigo_municipio': row[20].strip() or None,
                'telefone_1': formatar_telefone(row[21], row[22]),
                'telefone_2': formatar_telefone(row[23], row[24]),
                'email': row[27].strip().lower() or None,
                'fonte': 'receita_federal',
                'atualizado_em': datetime.now().isoformat(),
            }
            
            # Montar endereço completo
            partes_end = [
                prospect['tipo_logradouro'],
                prospect['logradouro'],
                prospect['numero'],
            ]
            prospect['endereco_completo'] = ' '.join(p for p in partes_end if p)
            
            todos_prospects.append(prospect)
        
        log(f"  Linhas: {count_linhas:,} | Filtrados (CNAE+ATIVA): {count_filtrados:,}")
        
        # Limpar memória
        del csv_content
    
    log(f"\nTotal de prospects filtrados: {len(todos_prospects):,}")
    return todos_prospects

# ══════════════════════════════════════════════════════════
# PASSO 3: BUSCAR DADOS COMPLEMENTARES (Empresas + Simples)
# ══════════════════════════════════════════════════════════

def processar_empresas(url_base, cnpjs_basicos_alvo):
    """
    Baixa dados de Empresas para pegar razão social, porte, natureza jurídica.
    Filtra apenas os cnpj_basico que estão na lista de prospects.
    """
    log("\n" + "=" * 60)
    log("PROCESSANDO EMPRESAS (razão social, porte)")
    log("=" * 60)
    
    dados_empresa = {}
    
    for i in range(10):
        nome_zip = f"Empresas{i}.zip"
        url = f"{url_base}/{nome_zip}"
        
        log(f"\nArquivo {i+1}/10: {nome_zip}")
        
        csv_content = baixar_e_extrair_csv(url, nome_zip)
        if not csv_content:
            continue
        
        # Colunas Empresas:
        # 0: cnpj_basico, 1: razao_social, 2: natureza_juridica,
        # 3: qualificacao_responsavel, 4: capital_social, 5: porte, 6: ente_federativo
        
        reader = csv.reader(io.StringIO(csv_content), delimiter=';', quotechar='"')
        count = 0
        
        for row in reader:
            if len(row) < 6:
                continue
            
            cnpj_basico = row[0].strip().zfill(8)
            
            if cnpj_basico in cnpjs_basicos_alvo:
                capital = 0
                try:
                    capital = float(row[4].strip().replace(',', '.')) if row[4].strip() else 0
                except:
                    pass
                
                dados_empresa[cnpj_basico] = {
                    'razao_social': row[1].strip(),
                    'natureza_juridica': row[2].strip(),
                    'capital_social': capital,
                    'porte': PORTE_MAP.get(row[5].strip(), row[5].strip()),
                }
                count += 1
        
        log(f"  Encontrados: {count:,}")
        del csv_content
    
    log(f"Total empresas mapeadas: {len(dados_empresa):,}")
    return dados_empresa

def processar_simples(url_base, cnpjs_basicos_alvo):
    """
    Baixa dados do Simples Nacional para identificar regime fiscal.
    """
    log("\n" + "=" * 60)
    log("PROCESSANDO SIMPLES NACIONAL (regime fiscal)")
    log("=" * 60)
    
    dados_simples = {}
    
    nome_zip = "Simples.zip"
    url = f"{url_base}/{nome_zip}"
    
    csv_content = baixar_e_extrair_csv(url, nome_zip)
    if not csv_content:
        log("  Não conseguiu baixar Simples.zip")
        return dados_simples
    
    # Colunas Simples:
    # 0: cnpj_basico, 1: opcao_simples, 2: data_opcao_simples,
    # 3: data_exclusao_simples, 4: opcao_mei, 5: data_opcao_mei,
    # 6: data_exclusao_mei
    
    reader = csv.reader(io.StringIO(csv_content), delimiter=';', quotechar='"')
    count = 0
    
    for row in reader:
        if len(row) < 5:
            continue
        
        cnpj_basico = row[0].strip().zfill(8)
        
        if cnpj_basico in cnpjs_basicos_alvo:
            opcao_simples = row[1].strip()
            opcao_mei = row[4].strip() if len(row) > 4 else ''
            
            if opcao_mei == 'S':
                regime = 'MEI'
            elif opcao_simples == 'S':
                regime = 'Simples Nacional'
            else:
                regime = 'Lucro Presumido/Real'  # Não dá pra distinguir sem dados adicionais
            
            dados_simples[cnpj_basico] = regime
            count += 1
    
    log(f"  Encontrados: {count:,}")
    del csv_content
    
    return dados_simples

def processar_municipios(url_base):
    """Baixa tabela de municípios para converter código → nome."""
    log("\nBaixando tabela de municípios...")
    
    municipios = {}
    nome_zip = "Municipios.zip"
    url = f"{url_base}/{nome_zip}"
    
    csv_content = baixar_e_extrair_csv(url, nome_zip)
    if not csv_content:
        return municipios
    
    reader = csv.reader(io.StringIO(csv_content), delimiter=';', quotechar='"')
    for row in reader:
        if len(row) >= 2:
            municipios[row[0].strip()] = row[1].strip()
    
    log(f"  {len(municipios):,} municípios carregados")
    return municipios

# ══════════════════════════════════════════════════════════
# PASSO 4: UPSERT NO SUPABASE
# ══════════════════════════════════════════════════════════

def upsert_supabase(prospects):
    """Faz bulk upsert dos prospects na tabela prospects_rf."""
    log("\n" + "=" * 60)
    log(f"INSERINDO {len(prospects):,} PROSPECTS NO SUPABASE")
    log("=" * 60)
    
    total_inseridos = 0
    total_erros = 0
    
    for i in range(0, len(prospects), BATCH_SIZE):
        batch = prospects[i:i + BATCH_SIZE]
        
        resp = supabase_request('POST', 'prospects_rf', data=batch)
        
        if resp and resp.status_code in (200, 201):
            total_inseridos += len(batch)
        else:
            total_erros += len(batch)
        
        if (i // BATCH_SIZE) % 50 == 0:
            log(f"  Progresso: {total_inseridos:,} inseridos, {total_erros:,} erros")
        
        # Pequeno delay para não sobrecarregar
        time.sleep(0.1)
    
    log(f"\n✅ CONCLUÍDO: {total_inseridos:,} inseridos, {total_erros:,} erros")
    return total_inseridos, total_erros

# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

def main():
    inicio = datetime.now()
    log("=" * 60)
    log("IMPORTADOR RECEITA FEDERAL → SUPABASE")
    log(f"WeDo CRM — Início: {inicio.strftime('%d/%m/%Y %H:%M:%S')}")
    log("=" * 60)
    
    # 1. Descobrir URLs
    url_base, mes_ref = descobrir_urls_receita()
    log(f"Referência: {mes_ref}")
    
    # 2. Baixar tabela de municípios
    municipios = processar_municipios(url_base)
    
    # 3. Processar Estabelecimentos (filtrar por CNAE)
    prospects = processar_estabelecimentos(url_base)
    
    if not prospects:
        log("❌ Nenhum prospect encontrado. Abortando.")
        sys.exit(1)
    
    # Coletar cnpj_basico únicos para buscar dados complementares
    cnpjs_basicos = set(p['cnpj_basico'] for p in prospects)
    log(f"\nCNPJs básicos únicos: {len(cnpjs_basicos):,}")
    
    # 4. Buscar dados de Empresas (razão social, porte, capital)
    dados_empresa = processar_empresas(url_base, cnpjs_basicos)
    
    # 5. Buscar dados do Simples Nacional (regime fiscal)
    dados_simples = processar_simples(url_base, cnpjs_basicos)
    
    # 6. Enriquecer prospects com dados complementares
    log("\nEnriquecendo prospects...")
    for p in prospects:
        cb = p['cnpj_basico']
        
        # Dados da empresa
        emp = dados_empresa.get(cb, {})
        p['razao_social'] = emp.get('razao_social', p.get('nome_fantasia', ''))
        p['capital_social'] = emp.get('capital_social', 0)
        p['porte'] = emp.get('porte', '')
        p['natureza_juridica'] = emp.get('natureza_juridica', '')
        
        # Regime fiscal
        p['regime_fiscal'] = dados_simples.get(cb, 'Lucro Presumido/Real')
        
        # Nome do município
        p['cidade'] = municipios.get(p.get('codigo_municipio', ''), '')
        
        # Remover campos auxiliares que não vão pro banco
        p.pop('cnpj_basico', None)
        p.pop('codigo_municipio', None)
        p.pop('tipo_logradouro', None)
    
    # 7. Upsert no Supabase
    inseridos, erros = upsert_supabase(prospects)
    
    # 8. Resumo
    fim = datetime.now()
    duracao = fim - inicio
    log("\n" + "=" * 60)
    log("RESUMO FINAL")
    log("=" * 60)
    log(f"Prospects processados: {len(prospects):,}")
    log(f"Inseridos no Supabase: {inseridos:,}")
    log(f"Erros: {erros:,}")
    log(f"Duração total: {duracao}")
    log(f"Fim: {fim.strftime('%d/%m/%Y %H:%M:%S')}")
    log("=" * 60)

if __name__ == '__main__':
    main()
