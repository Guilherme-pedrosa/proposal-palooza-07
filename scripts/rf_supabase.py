import base64
import json
import os
from urllib.parse import urlparse


def limpar_env_secret(value: str) -> str:
    return (
        value.strip()
        .replace('%0A', '')
        .replace('%0a', '')
        .replace('%0D', '')
        .replace('%0d', '')
        .replace('\n', '')
        .replace('\r', '')
        .rstrip('/')
    )


def carregar_config_supabase():
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('UPABASE_SERVICE_ROLE_KEY')
    if not key:
        raise RuntimeError(
            'SUPABASE_SERVICE_ROLE_KEY ausente no ambiente (fallback aceito: UPABASE_SERVICE_ROLE_KEY)'
        )

    return (
        limpar_env_secret(os.environ['SUPABASE_URL']),
        limpar_env_secret(key),
    )


def _decodificar_payload_jwt(token: str) -> dict:
    partes = token.split('.')
    if len(partes) != 3:
        raise RuntimeError('SUPABASE_SERVICE_ROLE_KEY inválida: JWT malformado')

    payload = partes[1]
    padding = '=' * (-len(payload) % 4)

    try:
        bruto = base64.urlsafe_b64decode(payload + padding)
        return json.loads(bruto.decode('utf-8'))
    except Exception as exc:
        raise RuntimeError('SUPABASE_SERVICE_ROLE_KEY inválida: não foi possível decodificar o JWT') from exc


def _extrair_project_ref(url: str) -> str:
    hostname = urlparse(url).hostname or ''
    return hostname.split('.')[0]


def validar_config_supabase(url: str, key: str):
    if not url.startswith('https://') or '.' not in url:
        raise RuntimeError('SUPABASE_URL inválida após sanitização')

    payload = _decodificar_payload_jwt(key)
    role = payload.get('role')
    if role != 'service_role':
        raise RuntimeError(
            'SUPABASE_SERVICE_ROLE_KEY inválida: o workflow está usando uma chave sem permissão de service_role '
            '(provavelmente anon/publishable key)'
        )

    ref_url = _extrair_project_ref(url)
    ref_key = payload.get('ref')
    if ref_url and ref_key and ref_url != ref_key:
        raise RuntimeError(
            'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apontam para projetos diferentes'
        )

    return payload


def resumir_erro_http(response, contexto: str) -> str:
    corpo = (response.text or '').strip().replace('\n', ' ')
    if len(corpo) > 300:
        corpo = corpo[:300] + '...'
    return f'{contexto} falhou ({response.status_code}): {corpo or "sem corpo de resposta"}'


def status_rest_sucesso(status_code: int) -> bool:
    return status_code in (200, 201, 204, 206)