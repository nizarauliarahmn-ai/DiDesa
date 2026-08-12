export interface AiUsage {
  usedQuota: number;
  totalQuota: number;
  remainingQuota: number;
  hasQuota: boolean;
}

export interface AiChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface AiChatResult {
  reply: string;
  model: string;
  usage: AiUsage;
}

export interface AiChatOptions {
  systemPrompt?: string;
  apiKey?: string;
  fileData?: string;
  mimeType?: string;
  requireJson?: boolean;
}

export class QuotaExceededError extends Error {
  usage: AiUsage | null;
  constructor(message: string, usage: AiUsage | null = null) {
    super(message);
    this.name = 'QuotaExceededError';
    this.usage = usage;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 429 && (data.code === 'QUOTA_EXCEEDED' || !res.ok)) {
    throw new QuotaExceededError(data.error || 'Kuota AI harian telah habis.', data.usage || null);
  }

  if (!res.ok) {
    throw new Error(data.error || `Terjadi kesalahan pada server (HTTP ${res.status}).`);
  }

  return data as T;
}

/**
 * Ambil sisa kuota AI harian sebuah desa langsung dari server.
 */
export async function fetchAiUsage(tenantId: string): Promise<AiUsage> {
  const res = await fetch(`/api/ai/usage?tenantId=${encodeURIComponent(tenantId)}`);
  return parseResponse<AiUsage>(res);
}

/**
 * Kirim percakapan AI ke endpoint server sendiri (bukan langsung ke Google AI Studio).
 * Server yang memegang API key dan menerapkan kuota harian per desa.
 */
export async function sendAiChat(
  tenantId: string,
  messages: AiChatMessage[],
  options: AiChatOptions = {}
): Promise<AiChatResult> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      messages,
      systemPrompt: options.systemPrompt,
      apiKey: options.apiKey,
      fileData: options.fileData,
      mimeType: options.mimeType,
      requireJson: options.requireJson,
    }),
  });
  return parseResponse<AiChatResult>(res);
}

/** Ambil tenantId aktif dari localStorage, konsisten dengan pola komponen lain. */
export function getActiveTenantId(): string {
  try {
    const authUserStr = localStorage.getItem('didesa_auth_user');
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      if (authUser && authUser.tenantId) return authUser.tenantId;
    }
  } catch {
    // ignore
  }
  return 'sukamakmur';
}

export interface ParseInvitationResult {
  nomorSuratUndangan?: string;
  maksudPerjalanan?: string;
  tempatTujuan?: string;
  tanggalBerangkat?: string;
  tanggalKembali?: string;
  instansiPengundang?: string;
  model?: string;
  fileName?: string;
}

/**
 * Kirim PDF surat undangan ke endpoint khusus /api/ai/parse-invitation.
 * Server yang memegang Gemini API key membaca dokumen lalu mengembalikan data SPPD.
 */
export async function parseInvitationPdf(
  file: File,
  opts: { tenantId?: string } = {}
): Promise<ParseInvitationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch('/api/ai/parse-invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: opts.tenantId || '',
      fileName: file.name,
      fileData: base64Data,
      mimeType: file.type || 'application/pdf',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    }),
  });
  return parseResponse<ParseInvitationResult>(res);
}