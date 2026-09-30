// Vercel Routing Middleware — OG tag dinamis untuk link share dokumen.
// Crawler chat (WhatsApp/Telegram/dll) tidak menjalankan JS, jadi tag OG
// harus disuntik di server. Hanya berjalan untuk path '/' (lihat matcher);
// request lain terus tanpa disentuh. Pola data sama dengan server.ts (self-host).

import { next, rewrite } from "@vercel/functions";

const SUPABASE_URL = "https://rmrctorxzprrmshorcut.supabase.co";
// Public anon key — sama persis dengan yang dikirim di bundle frontend.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA";

const BYPASS_HEADER = "x-og-internal";

export const config = {
  runtime: "nodejs",
  matcher: ["/", "/s/:path*"],
};

const BOT_UA =
  /whatsapp|telegram|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|line|viber|skype|vkshare|pinterest|redditbot|applebot|bingpreview|duckduckbot|yandex|baidu/i;

interface ShareDef {
  tab: string;
  idParam: string;
  docKey: string;
  shortLabel: string;
  fallbackTitle: string;
}

const SHARE_DEFS: ShareDef[] = [
  { tab: "perdes", idParam: "perdes_id", docKey: "perdes", shortLabel: "Perdes", fallbackTitle: "Peraturan Desa" },
  { tab: "sk_kades", idParam: "sk_id", docKey: "sk_kades", shortLabel: "SK Kades", fallbackTitle: "Surat Keputusan" },
  { tab: "berita_acara", idParam: "ba_id", docKey: "berita_acara", shortLabel: "Berita Acara", fallbackTitle: "Berita Acara" },
];

const esc = (s: any) => String(s ?? "").replace(/"/g, "&quot;");

async function sbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function middleware(request: Request) {
  try {
    // Hindari loop saat mengambil index.html internal.
    if (request.headers.get(BYPASS_HEADER)) {
      return next();
    }

    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "";
    const newsId = url.searchParams.get("id") || "";

    // Logo desa per tenant untuk og:image (WhatsApp tak bisa memuat base64,
    // jadi serve bytes-nya lewat endpoint ini). Berlaku semua tenant.
    if (url.searchParams.get("oglogo") === "1") {
      try {
        const parts = url.hostname.split(".");
        let targetDomain = "";
        if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
          targetDomain = parts[0];
        }
        let tenantId = "";
        if (targetDomain) {
          const orVal = encodeURIComponent(
            `(domain.ilike.${targetDomain},domain.ilike.${targetDomain}.*)`
          );
          const tenants = await sbGet(`tenants?select=id&or=${orVal}`);
          if (Array.isArray(tenants) && tenants[0]?.id) tenantId = tenants[0].id;
        }
        if (tenantId) {
          const logoRows: any = await sbGet(
            `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.kop_logo_url`
          );
          const val = Array.isArray(logoRows) && logoRows[0]?.value ? String(logoRows[0].value) : "";
          if (/^https?:\/\//i.test(val)) {
            return Response.redirect(val, 302);
          }
          const m = val.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
          if (m) {
            const bytes = Buffer.from(m[2], "base64");
            return new Response(bytes as any, {
              status: 200,
              headers: {
                "Content-Type": m[1],
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
        }
      } catch {
        // abaikan, jatuh ke logo default di bawah
      }
      return Response.redirect(`${url.origin}/logo.jpg`, 302);
    }

    const def = SHARE_DEFS.find(
      (d) => tab === d.tab && !!url.searchParams.get(d.idParam)
    );
    const isNews = !def && !!newsId && newsId.startsWith("n-");

    // Jalur /s/<tipe>/<id> — matcher path eksplisit agar bot & manusia
    // ditangani deterministik (bot: HTML injeksi OG; manusia: rewrite ke SPA).
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs[0] === "s" && segs.length >= 3) {
      const sMap: Record<string, ShareDef> = {
        perdes: { tab: "perdes", idParam: "perdes_id", docKey: "perdes", shortLabel: "Perdes", fallbackTitle: "Peraturan Desa" },
        sk: { tab: "sk_kades", idParam: "sk_id", docKey: "sk_kades", shortLabel: "SK Kades", fallbackTitle: "Surat Keputusan" },
        ba: { tab: "berita_acara", idParam: "ba_id", docKey: "berita_acara", shortLabel: "Berita Acara", fallbackTitle: "Berita Acara" },
      };
      const sm = sMap[segs[1]];
      let sDocId = "";
      try {
        sDocId = decodeURIComponent(segs[2] || "");
      } catch {
        sDocId = segs[2] || "";
      }
      if (!sm || !sDocId) return next();
      const ua = request.headers.get("user-agent") || "";
      if (!BOT_UA.test(ua)) {
        const dest = new URL(url.origin + "/");
        dest.searchParams.set("tab", sm.tab);
        dest.searchParams.set(sm.idParam, sDocId);
        return rewrite(dest);
      }
      try {
        const parts = url.hostname.split(".");
        let targetDomain = "";
        if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
          targetDomain = parts[0];
        }
        let tenantId = "";
        if (targetDomain) {
          const orVal = encodeURIComponent(
            `(domain.ilike.${targetDomain},domain.ilike.${targetDomain}.*)`
          );
          const tenants = await sbGet(`tenants?select=id&or=${orVal}`);
          if (Array.isArray(tenants) && tenants[0]?.id) tenantId = tenants[0].id;
        }
        if (!tenantId) return next();
        const rows: any = await sbGet(
          `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.produk_hukum_data`
        );
        const all = Array.isArray(rows) && rows[0]?.value ? JSON.parse(rows[0].value) : {};
        const items = all[sm.docKey] || [];
        const item = items.find((i: any) => i.id === sDocId);
        if (!item) return next();
        const title = `${sm.shortLabel} - ${item.uraian || sm.fallbackTitle}`;
        const description = [
          item.no ? `Nomor: ${item.no}` : "",
          item.tahun ? `Tahun: ${item.tahun}` : "",
          item.tanggal ? `Tanggal: ${item.tanggal}` : "",
          item.jenisDokumen ? `Jenis: ${item.jenisDokumen}` : "",
          item.ketLain ? String(item.ketLain).substring(0, 120) : "",
        ]
          .filter(Boolean)
          .join(" • ");
        let desaName = "Desa";
        const nameRows: any = await sbGet(
          `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.kop_desa`
        );
        if (Array.isArray(nameRows) && nameRows[0]?.value) {
          desaName = String(nameRows[0].value).replace(/^(desa)\s+/i, "").trim() || desaName;
        }
        const imageUrl = `${url.origin}/?oglogo=1`;
        const ogTags = `
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description).replace(/\n/g, " ").substring(0, 200)}" />
    <meta property="og:url" content="${esc(url.href)}" />
    <meta property="og:site_name" content="${esc(desaName)}" />
    <meta property="og:locale" content="id_ID" />
    <meta property="og:image" content="${esc(imageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description).replace(/\n/g, " ").substring(0, 200)}" />
    <meta name="twitter:image" content="${esc(imageUrl)}" />
    <title>${esc(title)} - ${esc(desaName)}</title>`;
        const indexRes = await fetch(`${url.origin}/`, {
          headers: { [BYPASS_HEADER]: "1" },
        });
        if (!indexRes.ok) return next();
        const html = await indexRes.text();
        if (!html.includes("</head>")) return next();
        return new Response(html.replace("</head>", () => `${ogTags}\n  </head>`), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, max-age=0",
          },
        });
      } catch {
        return next();
      }
    }
    if (!def && !isNews) {
      return next();
    }

    // Jalur asli memakai single-exit agar tahap kegagalan terlacak.
    let stage = "init";
    try {
      stage = "tenant";
      // Resolve tenant dari subdomain (cermin tenantResolver + server.ts).
      const parts = url.hostname.split(".");
      let targetDomain = "";
      if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
        targetDomain = parts[0];
      }
      let tenantId = "";
      if (targetDomain) {
        const orVal = encodeURIComponent(
          `(domain.ilike.${targetDomain},domain.ilike.${targetDomain}.*)`
        );
        const tenants = await sbGet(`tenants?select=id&or=${orVal}`);
        if (Array.isArray(tenants) && tenants[0]?.id) tenantId = tenants[0].id;
      }
      if (!tenantId) {
        stage = "no-tenant";
        throw new Error("no-tenant");
      }

      let title = "";
      let description = "";
      let image = "";

      stage = "fetch-doc";
      if (isNews) {
        const rows: any = await sbGet(
          `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.didesa_news_list`
        );
        const list = Array.isArray(rows) && rows[0]?.value ? JSON.parse(rows[0].value) : [];
        const item = (Array.isArray(list) ? list : []).find((n: any) => n.id === newsId);
        if (!item) {
          stage = "item-not-found";
          throw new Error("item-not-found");
        }
        title = item.title || "Berita Desa";
        description = item.excerpt || String(item.fullContent || "").substring(0, 160) || "";
        image = item.image || "";
      } else if (def) {
        const docId = url.searchParams.get(def.idParam) || "";
        const rows: any = await sbGet(
          `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.produk_hukum_data`
        );
        const all = Array.isArray(rows) && rows[0]?.value ? JSON.parse(rows[0].value) : {};
        const items = all[def.docKey] || [];
        const item = items.find((i: any) => i.id === docId);
        if (!item) {
          stage = "item-not-found";
          throw new Error("item-not-found");
        }
        title = `${def.shortLabel} - ${item.uraian || def.fallbackTitle}`;
        description = [
          item.no ? `Nomor: ${item.no}` : "",
          item.tahun ? `Tahun: ${item.tahun}` : "",
          item.tanggal ? `Tanggal: ${item.tanggal}` : "",
          item.jenisDokumen ? `Jenis: ${item.jenisDokumen}` : "",
          item.ketLain ? String(item.ketLain).substring(0, 120) : "",
        ]
          .filter(Boolean)
          .join(" • ");
      }

      stage = "desa-name";
      let desaName = "Desa";
      const nameRows: any = await sbGet(
        `saas_settings?select=value&tenant_id=eq.${tenantId}&key=eq.kop_desa`
      );
      if (Array.isArray(nameRows) && nameRows[0]?.value) {
        desaName = String(nameRows[0].value).replace(/^(desa)\s+/i, "").trim() || desaName;
      }

      stage = "build-tags";
    const origin = url.origin;
    // Logo desa via endpoint (mendukung base64) — fallback logo platform.
    const imageUrl = image || `${origin}/?oglogo=1`;
      const ogTags = `
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description).replace(/\n/g, " ").substring(0, 200)}" />
    <meta property="og:url" content="${esc(url.href)}" />
    <meta property="og:site_name" content="${esc(desaName)}" />
    <meta property="og:locale" content="id_ID" />
    <meta property="og:image" content="${esc(imageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description).replace(/\n/g, " ").substring(0, 200)}" />
    <meta name="twitter:image" content="${esc(imageUrl)}" />
    <title>${esc(title)} - ${esc(desaName)}</title>`;

      stage = "fetch-index";
      const indexRes = await fetch(`${origin}/`, {
        headers: { [BYPASS_HEADER]: "1" },
      });
      if (!indexRes.ok) {
        stage = `index-bad-status-${indexRes.status}`;
        throw new Error(stage);
      }
      const html = await indexRes.text();
      if (!html.includes("</head>")) {
        stage = "index-no-head";
        throw new Error(stage);
      }

      stage = "done";
      return new Response(html.replace("</head>", () => `${ogTags}\n  </head>`), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (e: any) {
      // Fallback: tetap sajikan halaman normal + komentar tahap kegagalan (tak terlihat pengunjung).
      try {
        const indexRes = await fetch(`${url.origin}/`, {
          headers: { [BYPASS_HEADER]: "1" },
        });
        const html = await indexRes.text();
        const failHtml = html.includes("</head>")
          ? html.replace("</head>", `<!-- og-mw: failed at ${stage} -->\n  </head>`)
          : html;
        return new Response(failHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        return next();
      }
    }
  } catch {
    return next();
  }
}
