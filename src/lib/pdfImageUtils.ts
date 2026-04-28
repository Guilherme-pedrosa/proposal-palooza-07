const PDF_IMAGE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy`;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  ) {
    return true;
  }

  return false;
}

export function buildPdfSafeImageUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.pathname.includes('/functions/v1/image-proxy')) {
      return parsed.toString();
    }

    if (parsed.origin === window.location.origin || isPrivateHostname(parsed.hostname)) {
      return parsed.toString();
    }

    return `${PDF_IMAGE_PROXY_URL}?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function getImageAsBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) {
    return url;
  }

  const safeUrl = buildPdfSafeImageUrl(url);

  try {
    const response = await fetch(safeUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar imagem: ${response.status}`);
    }

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (error) {
    console.warn('Não foi possível incorporar a imagem ao PDF', { url, error });
    return url;
  }
}