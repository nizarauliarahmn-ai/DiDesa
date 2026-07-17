import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import { 
  getResidents, 
  insertResident, 
  updateResident, 
  deleteResident, 
  getArchivedResidents,
  restoreResident,
  hardDeleteResident,
  getActiveDbEngine,
  getNotifications,
  addNotification,
  markAllNotificationsAsRead,
  getTenants,
  addTenant,
  updateTenant,
  deleteTenant,
  getGlobalUpdates,
  addGlobalUpdate,
  getGlobalSettings,
  saveGlobalSetting
} from "./server/db";

// API Routes
app.get("/api/notifications", (req, res) => {
  try {
    const notifs = getNotifications();
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications", (req, res) => {
  const { title, message, category } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }
  try {
    const newNotif = addNotification(title, message, category || "System");
    res.json(newNotif);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read-all", (req, res) => {
  try {
    const result = markAllNotificationsAsRead();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/db-status", (req, res) => {
  res.json({
    engine: getActiveDbEngine(),
    isProduction: process.env.NODE_ENV === "production"
  });
});

// Backward compatibility check
app.get("/api/supabase-status", (req, res) => {
  res.json({
    configured: getActiveDbEngine() !== "Memory",
    supabaseUrl: process.env.SUPABASE_URL || null,
    connected: getActiveDbEngine() !== "Memory"
  });
});

// POST to parse village profile & officers documents using Gemini
app.post("/api/parse-profile-document", async (req, res) => {
  const { fileData, mimeType, fileName } = req.body;
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: "fileData and mimeType are required" });
  }

  try {
    const ai = getGeminiClient();
    
    // Strip base64 data url prefix if present
    let cleanBase64 = fileData;
    if (fileData.includes(";base64,")) {
      cleanBase64 = fileData.split(";base64,")[1];
    }

    const documentPart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      }
    };

    const textPart = {
      text: `Analyze this document which contains a village profile (Profil Desa) and/or a list of village officials/personnel (perangkat/pejabat desa). 
      Extract the following information as accurately as possible from the text, lists, and tables in the document.
      
      Respond in Indonesian and format your entire response as a valid JSON object matching this exact schema:
      {
        "villageName": "Name of the village (Desa / Kelurahan, e.g. Desa Wasah Hilir)",
        "kecamatan": "Kecamatan name (e.g. Kecamatan Simpur)",
        "kabupaten": "Kabupaten name (prefixed with Pemerintah Kabupaten if applicable, e.g. Pemerintah Kabupaten Hulu Sungai Selatan)",
        "provinsi": "Provinsi name (e.g. Kalimantan Selatan)",
        "alamat": "Kantor desa address if found, otherwise keep blank",
        "kontak": "No. HP / Email of the office if found, otherwise keep blank",
        "officers": [
          {
            "name": "Full name of the officer",
            "role": "Their role/jabatan (e.g. Kepala Desa, Sekretaris Desa, Pj. Kepala Desa, Kaur Umum, Kasi Pemerintahan, dll.)",
            "nip": "NIP (Nomor Induk Pegawai) if any, or '-'"
          }
        ]
      }
      
      Do not include any Markdown explanation or backticks in the response. Return raw JSON string only.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [documentPart, textPart]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "{}";
    try {
      const parsedResult = JSON.parse(resultText.trim());
      res.json(parsedResult);
    } catch (parseErr) {
      console.error("Gemini raw text parse error. Raw text:", resultText);
      res.status(500).json({ error: "Failed to parse JSON response from Gemini", raw: resultText });
    }
  } catch (err: any) {
    console.error("Error parsing document with Gemini:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all tenants
app.get("/api/tenants", async (req, res) => {
  try {
    const tenants = await getTenants();
    res.json(tenants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new tenant
app.post("/api/tenants", async (req, res) => {
  try {
    const tenant = await addTenant(req.body);
    res.json({ success: true, tenant });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update tenant
app.put("/api/tenants/:id", async (req, res) => {
  try {
    const tenant = await updateTenant(req.params.id, req.body);
    res.json({ success: true, tenant });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tenant
app.delete("/api/tenants/:id", async (req, res) => {
  try {
    const success = await deleteTenant(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all global updates
app.get("/api/global-updates", async (req, res) => {
  try {
    const updates = await getGlobalUpdates();
    res.json(updates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new global update
app.post("/api/global-updates", async (req, res) => {
  try {
    const update = await addGlobalUpdate(req.body);
    res.json(update);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET global settings
app.get("/api/global-settings", async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST update global settings
app.post("/api/global-settings", async (req, res) => {
  try {
    const { global_app_name, global_app_logo, global_app_color, global_print_footer } = req.body;
    if (global_app_name !== undefined) await saveGlobalSetting("global_app_name", global_app_name);
    if (global_app_logo !== undefined) await saveGlobalSetting("global_app_logo", global_app_logo);
    if (global_app_color !== undefined) await saveGlobalSetting("global_app_color", global_app_color);
    if (global_print_footer !== undefined) await saveGlobalSetting("global_print_footer", global_print_footer);
    
    const settings = await getGlobalSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all residents
app.get("/api/residents", async (req, res) => {
  try {
    const tenant_id = req.query.tenant_id as string | undefined;
    const residents = await getResidents(tenant_id);
    res.json(residents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new resident
app.post("/api/residents", async (req, res) => {
  const newResident = req.body;
  if (!newResident.nik) {
    return res.status(400).json({ error: "NIK is required" });
  }

  try {
    const result = await insertResident(newResident);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST batch insert residents
app.post("/api/residents/batch", async (req, res) => {
  const residentsList = req.body;
  if (!Array.isArray(residentsList)) {
    return res.status(400).json({ error: "Data must be an array" });
  }

  try {
    const results = [];
    for (const resident of residentsList) {
      if (resident.nik && resident.name) {
        const result = await insertResident(resident);
        results.push(result);
      }
    }
    res.json({ success: true, count: results.length, data: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update resident
app.put("/api/residents/:nik", async (req, res) => {
  const { nik } = req.params;
  const updatedResident = req.body;

  try {
    const result = await updateResident(nik, updatedResident);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Memory store for pending approvals
interface PendingApproval {
  nik: string;
  name: string;
  actionType: "delete" | "move" | "edit" | "status_change";
  originalStatus: string;
  requestDate: string;
  details?: any;
}
const pendingApprovalsStore: Record<string, PendingApproval> = {};

// POST request approval
app.post("/api/residents/:nik/request-approval", async (req, res) => {
  const { nik } = req.params;
  const { actionType, originalStatus, details } = req.body;

  if (!actionType) {
    return res.status(400).json({ error: "Action type is required" });
  }

  try {
    const residents = await getResidents();
    const resident = residents.find((r) => r.nik === nik);
    if (!resident) {
      return res.status(404).json({ error: "Resident not found" });
    }

    // Set resident status to pending_approval in DB
    const updated = {
      ...resident,
      status: "pending_approval",
      statusColor: "yellow"
    };
    await updateResident(nik, updated, true);

    // Save pending approval metadata
    pendingApprovalsStore[nik] = {
      nik,
      name: resident.name,
      actionType,
      originalStatus: originalStatus || resident.status || "Belum Kawin",
      requestDate: new Date().toISOString(),
      details
    };

    addNotification(
      "Pengajuan Persetujuan",
      `Admin mengajukan permohonan ${actionType === 'delete' ? 'Hapus Data' : actionType === 'move' ? 'Pindah/Mutasi' : actionType === 'edit' ? 'Edit Data' : 'Perubahan Status'} warga ${resident.name} (NIK: ${nik}).`,
      "Residents"
    );

    res.json({ success: true, resident: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all approvals
app.get("/api/approvals", async (req, res) => {
  try {
    const residents = await getResidents();
    const pendingResidents = residents.filter((r) => r.status === "pending_approval");

    const approvals = pendingResidents.map((r) => {
      const meta = pendingApprovalsStore[r.nik] || {
        nik: r.nik,
        name: r.name,
        actionType: "delete" as const,
        originalStatus: "Belum Kawin",
        requestDate: new Date().toISOString()
      };
      return {
        ...r,
        pendingMeta: meta
      };
    });

    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST approve action
app.post("/api/residents/:nik/approve", async (req, res) => {
  const { nik } = req.params;

  try {
    const meta = pendingApprovalsStore[nik];
    const residents = await getResidents();
    const resident = residents.find((r) => r.nik === nik);
    const name = resident ? resident.name : (meta ? meta.name : "Penduduk");

    let success = false;
    if (meta) {
      if (meta.actionType === 'delete' || meta.actionType === 'move') {
        success = await deleteResident(nik, true);
      } else if (meta.actionType === 'edit' || meta.actionType === 'status_change') {
        await updateResident(nik, meta.details, true);
        success = true;
      }
    } else if (resident) {
      // Fallback if memory store was cleared but DB still says pending
      await updateResident(nik, { status: "Aktif", statusColor: "green" }, true);
      success = true;
    }

    // Clear from store
    delete pendingApprovalsStore[nik];

    addNotification(
      "Pengajuan Disetujui",
      `Super Admin menyetujui ${meta?.actionType === 'delete' ? 'penghapusan' : meta?.actionType === 'move' ? 'perpindahan' : meta?.actionType === 'edit' ? 'edit data' : 'perubahan status'} warga ${name}.`,
      "Residents"
    );

    res.json({ success, message: `Resident NIK ${nik} approved and processed` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST reject action
app.post("/api/residents/:nik/reject", async (req, res) => {
  const { nik } = req.params;

  try {
    const meta = pendingApprovalsStore[nik];
    const residents = await getResidents();
    const resident = residents.find((r) => r.nik === nik);

    if (!resident) {
      return res.status(404).json({ error: "Resident not found" });
    }

    const restoreStatus = meta ? meta.originalStatus : "Aktif";
    const restoreColor = restoreStatus === "Meninggal" ? "gray" : "green";

    const restored = {
      ...resident,
      status: restoreStatus,
      statusColor: restoreColor
    };

    await updateResident(nik, restored, true);

    // Clear from store
    delete pendingApprovalsStore[nik];

    addNotification(
      "Pengajuan Ditolak",
      `Super Admin menolak ${meta?.actionType === 'delete' ? 'penghapusan' : meta?.actionType === 'move' ? 'perpindahan' : meta?.actionType === 'edit' ? 'edit data' : 'perubahan status'} warga ${resident.name}.`,
      "Residents"
    );

    res.json({ success: true, resident: restored });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE resident
app.delete("/api/residents/:nik", async (req, res) => {
  const { nik } = req.params;

  try {
    const success = await deleteResident(nik);
    res.json({ success, message: `Resident with NIK ${nik} processed` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/residents/archived", async (req, res) => {
  try {
    const archived = await getArchivedResidents();
    res.json(archived);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/residents/:nik/restore", async (req, res) => {
  const { nik } = req.params;
  try {
    const success = await restoreResident(nik);
    addNotification("Penduduk Direstore", `Data penduduk dengan NIK ${nik} telah dikembalikan dari tong sampah.`, "Residents");
    res.json({ success, message: `Resident with NIK ${nik} restored` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/residents/:nik/hard-delete", async (req, res) => {
  const { nik } = req.params;
  try {
    const success = await hardDeleteResident(nik);
    addNotification("Penduduk Dihapus Permanen", `Data penduduk dengan NIK ${nik} telah dihapus permanen.`, "Residents");
    res.json({ success, message: `Resident with NIK ${nik} hard deleted` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount Vite middleware or static files
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
