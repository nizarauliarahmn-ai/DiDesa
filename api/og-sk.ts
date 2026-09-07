import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).send("Missing id");
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KE || "").trim();
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send("Supabase not configured");
  }

  try {
    const hostname = req.headers.host || "";
    const parts = hostname.split(".");
    let targetDomain = "";
    if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
      targetDomain = parts[0];
    }
    if (!targetDomain) {
      return res.status(404).send("No tenant domain");
    }

    const tenantRes = await fetch(
      `${supabaseUrl}/rest/v1/tenants?select=id&or=(domain.eq.${targetDomain},domain.like.${targetDomain}.*)`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const tenants = await tenantRes.json();
    const tenantId = tenants?.[0]?.id;
    if (!tenantId) return res.status(404).send("Tenant not found");

    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/saas_settings?tenant_id=eq.${tenantId}&key=eq.produk_hukum_data&select=value`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const settings = await settingsRes.json();
    const value = settings?.[0]?.value;
    if (!value) return res.status(404).send("Data not found");

    const all = JSON.parse(value);
    const skItems = all["sk_kades"] || [];
    const skItem = skItems.find((i: any) => i.id === id);
    if (!skItem) return res.status(404).send("SK not found");

    const title = `SK Kades - ${skItem.uraian || "Surat Keputusan"}`;
    const description = [
      skItem.no ? `Nomor: ${skItem.no}` : "",
      skItem.tahun ? `Tahun: ${skItem.tahun}` : "",
      skItem.jenisDokumen ? `Jenis: ${skItem.jenisDokumen}` : "",
    ].filter(Boolean).join(" • ");

    const shareUrl = `${req.headers["x-forwarded-proto"] || "https"}://${hostname}/?tenant=${targetDomain}&tab=sk_kades&sk_id=${id}`;
    const pageUrl = `${req.headers["x-forwarded-proto"] || "https"}://${hostname}/?tenant=${targetDomain}&tab=sk_kades&sk_id=${id}`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
  <meta property="og:description" content="${description.replace(/"/g, "&quot;").substring(0, 200)}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:site_name" content="DiDesa" />
  <meta property="og:locale" content="id_ID" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
  <meta name="twitter:description" content="${description.replace(/"/g, "&quot;").substring(0, 200)}" />
  <title>${title} - DiDesa</title>
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Memuat... <a href="${pageUrl}">Klik di sini jika tidak otomatis</a></p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.status(200).send(html);
  } catch (err: any) {
    console.error("[OG SK API] Error:", err.message);
    return res.status(500).send("Internal error");
  }
}
