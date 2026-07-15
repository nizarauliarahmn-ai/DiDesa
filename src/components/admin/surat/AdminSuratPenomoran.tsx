import React, { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import {
  Settings,
  Save,
  AlertCircle,
  RefreshCw,
  Hash,
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Check,
  Image,
  Building,
} from "lucide-react";
import {
  getLetterClassifications,
  saveLetterClassifications,
  LetterClassification,
  getGlobalSequenceNumber,
} from "../../../utils/letterClassifications";
import { showToast } from "../../../utils/toast";
import ConfirmModal from "../../common/ConfirmModal";

export default function AdminSuratPenomoran() {
  const [format, setFormat] = useState(
    "[NO KODE SURAT]/[NO URUT SURAT]/WHi-[KODE]/[TAHUN]",
  );

  // Custom confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const [autoReset, setAutoReset] = useState(true);
  const [classifications, setClassifications] = useState<
    LetterClassification[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Kop Surat Settings loaded from central settings for preview
  const kopLogoUrl =
    localStorage.getItem("kop_logo_url") ||
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png";

  // Modal / Form state for SaaS Request
  const [showModal, setShowModal] = useState(false);
  const [saasLetterName, setSaasLetterName] = useState("");
  const [saasLetterFile, setSaasLetterFile] = useState<File | null>(null);

  useEffect(() => {
    setClassifications(getLetterClassifications());
    let storedFormat = localStorage.getItem("surat_format");
    if (!storedFormat) {
      storedFormat = "[NO KODE SURAT]/[NO URUT SURAT]/WHi-[KODE]/[TAHUN]";
      localStorage.setItem("surat_format", storedFormat);
    }
    if (storedFormat) {
      setFormat(storedFormat);
    }
    const storedReset = localStorage.getItem("surat_autoreset");
    if (storedReset) setAutoReset(storedReset === "true");
  }, []);

  const availableVariables = [
    {
      code: "[NO KODE SURAT]",
      desc: "No. klasifikasi arsip (cth: 145, 400)",
      sample: "145",
    },
    {
      code: "[NO URUT SURAT]",
      desc: "No. urut surat otomatis (cth: 001, 002)",
      sample: "001",
    },
    {
      code: "[KODE]",
      desc: "Singkatan jenis surat (cth: SKD, SKU)",
      sample: "SKD",
    },
    {
      code: "[BULAN]",
      desc: "Bulan angka Romawi (cth: I, II, VII)",
      sample: "VII",
    },
    {
      code: "[BULAN_ANGKA]",
      desc: "Bulan dua digit (cth: 01, 02, 07)",
      sample: "07",
    },
    { code: "[TAHUN]", desc: "Tahun empat digit (cth: 2026)", sample: "2026" },
    {
      code: "[TAHUN_2D]",
      desc: "Tahun dua digit terakhir (cth: 26)",
      sample: "26",
    },
    {
      code: "[DESA]",
      desc: "Singkatan/inisial nama desa (cth: WHi, DS)",
      sample: "WHi",
    },
    {
      code: "[NAMA_DESA]",
      desc: "Nama desa lengkap (cth: Sukamaju)",
      sample: "Sukamaju",
    },
  ];

  const getPreviewNumber = (fmt: string) => {
    const date = new Date();
    const romanMonths = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ];
    const romanMonth = romanMonths[date.getMonth()];
    const numericMonth = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const year2D = String(year).slice(-2);
    const villageName =
      localStorage.getItem("village_name") || "Desa Wasah Hilir";
    const kecamatan =
      localStorage.getItem("village_kecamatan") || "Kecamatan Simpur";
    const kabupaten =
      localStorage.getItem("village_kabupaten") ||
      "Pemerintah Kabupaten Hulu Sungai Selatan";

    const getDesaInitial = (name: string) => {
      if (name.toLowerCase().includes("wasah hilir")) return "WHi";
      if (name.toLowerCase().includes("sukamaju")) return "DS-SKM";
      const words = name
        .replace(/desa|kelurahan/gi, "")
        .trim()
        .split(/\s+/);
      if (words.length >= 2) {
        return words
          .map((w) => w[0])
          .join("")
          .toUpperCase();
      } else if (words.length === 1 && words[0].length > 0) {
        return words[0].substring(0, 3).toUpperCase();
      }
      return "DS";
    };

    const desaInitial = getDesaInitial(villageName);

    return fmt
      .replace(/\[NO KODE SURAT\]/g, "145")
      .replace(/\[KODE KLASIFIKASI\]/g, "145")
      .replace(/\[NO URUT SURAT\]/g, "001")
      .replace(/\[NO\]/g, "001")
      .replace(/\[KODE\]/g, "SKD")
      .replace(/\[SINGKATAN SURAT\]/g, "SKD")
      .replace(/\[BULAN\]/g, romanMonth)
      .replace(/\[BULAN_ANGKA\]/g, numericMonth)
      .replace(/\[TAHUN\]/g, String(year))
      .replace(/\[TAHUN_2D\]/g, year2D)
      .replace(/\[NAMA_DESA\]/g, villageName.replace(/desa\s+/gi, ""))
      .replace(/\[KECAMATAN\]/g, kecamatan)
      .replace(/\[KABUPATEN\]/g, kabupaten)
      .replace(/\[DESA\]/g, desaInitial);
  };

  const handleAppendVariable = (variableCode: string) => {
    setFormat((prev) => {
      if (prev.endsWith("/") || prev === "") {
        return prev + variableCode;
      }
      return prev + "/" + variableCode;
    });
    showToast(`Ditambahkan ${variableCode} ke format!`, "success");
  };

const handleSaveSettings = () => {
  localStorage.setItem("surat_format", format);
  localStorage.setItem("surat_autoreset", autoReset ? "true" : "false");

  try {
    const settingsToSave = [
      { key: 'surat_format', value: format },
      { key: 'surat_autoreset', value: autoReset ? "true" : "false" }
    ];
    supabase.from('saas_settings').upsert(settingsToSave, { onConflict: 'key' }).then();
  } catch (e) {}

  // Dispatch custom event so that other components re-load settings
  window.dispatchEvent(new Event("village_settings_updated"));

  showToast("Pengaturan format penomoran berhasil disimpan!", "success");
};

const filteredItems = classifications.filter(
  (item) =>
    item.jenis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.klasifikasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.kodeKlasifikasi &&
      item.kodeKlasifikasi.toLowerCase().includes(searchQuery.toLowerCase())),
);

const handleOpenSaaSRequest = () => {
  setSaasLetterName("");
  setSaasLetterFile(null);
  setShowModal(true);
};
const handleToggleVisibility = (id: string, currentVal: boolean) => {
  const updated = classifications.map((c) =>
    c.id === id ? { ...c, isVisible: !currentVal } : c,
  );
  setClassifications(updated);
  saveLetterClassifications(updated);
  showToast("Status visibilitas berhasil diubah", "success");
};
const handleSaaSSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!saasLetterName.trim() || !saasLetterFile) {
    showToast("Nama surat dan file contoh wajib diisi!", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const fileData = event.target?.result;
    
    // Save request to localStorage for SaaS view
    const existingReqs = JSON.parse(localStorage.getItem("saas_letter_requests") || "[]");
    const newReq = {
      id: Date.now().toString(),
      villageName: localStorage.getItem("village_name") || "Desa Wasah Hilir",
      letterName: saasLetterName.toUpperCase().trim(),
      fileName: saasLetterFile.name,
      fileData: fileData, // Base64 content for downloading
      timestamp: new Date().toISOString(),
      status: "pending"
    };
    
    try {
      localStorage.setItem("saas_letter_requests", JSON.stringify([newReq, ...existingReqs]));
      showToast(
        "Permintaan penambahan jenis surat beserta contoh file telah dikirim ke tim SaaS untuk ditinjau.",
        "success"
      );
      setShowModal(false);
    } catch(err) {
      showToast("Gagal menyimpan, file contoh mungkin terlalu besar! Maksimal ukuran file disarankan di bawah 2MB.", "error");
    }
  };
  
  reader.readAsDataURL(saasLetterFile);
};
const authUser = JSON.parse(localStorage.getItem("didesa_auth_user") || "{}");
const isSuperAdmin = authUser?.role === "kades" || authUser?.isImpersonated;

return (
  <div className="max-w-5xl mx-auto space-y-6">
    {/* Header */}
    <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Pengaturan Penomoran Surat
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Atur format penomoran otomatis secara global dan visibilitas pilihan
          surat.
        </p>
      </div>
      {isSuperAdmin ? (
        <button
          onClick={handleOpenSaaSRequest}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm dark:shadow-none hover:scale-102 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <FileText className="w-4 h-4" /> Minta Tambah Surat
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 font-extrabold self-start sm:self-auto">
          Mode Baca-Saja (Admin)
        </div>
      )}
    </div>

    {!isSuperAdmin && (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-amber-800 leading-relaxed font-extrabold">
            Akses Terbatas (Baca-Saja)
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
            Anda masuk sebagai Admin biasa. Hanya Kepala Desa (Super Admin) yang
            memiliki wewenang penuh untuk mengubah format penomoran surat maupun
            menentukan surat mana saja yang aktif/tampil di portal layanan
            mandiri warga.
          </p>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Format & Settings */}
      <div className="lg:col-span-1 space-y-6">
        {/* Format Penomoran */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Format Nomor</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Template Format
              </label>
              <input
                type="text"
                value={format}
                disabled={!isSuperAdmin}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Contoh: [NO KODE SURAT]/[NO URUT SURAT]/WHi-[KODE]/[TAHUN]"
                className={`w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono text-gray-900 dark:text-white font-bold bg-gray-50/50 dark:bg-slate-800/50 ${!isSuperAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                  Variabel Tersedia:
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  Sistem akan otomatis menambahkan pembatas miring jika
                  diperlukan.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {availableVariables.map((v) => (
                  <button
                    key={v.code}
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => handleAppendVariable(v.code)}
                    className={`flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 transition-all text-left group ${isSuperAdmin ? "hover:bg-emerald-50 hover:border-emerald-200" : "cursor-not-allowed opacity-70"}`}
                    title={
                      isSuperAdmin
                        ? `Klik untuk menambahkan ${v.code}`
                        : "Hanya untuk Super Admin"
                    }
                  >
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                        {v.code}
                      </span>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{v.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                      {v.sample}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-emerald-800 font-medium">
                  Preview Format (SK Domisili):
                </p>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">
                  AKTIF
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-900 font-mono break-all leading-relaxed">
                {getPreviewNumber(format) || (
                  <span className="text-gray-400 italic font-normal">
                    Format kosong
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Reset Settings */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Reset Otomatis</h3>
          </div>

          <label
            className={`flex items-start gap-3 group ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed"}`}
          >
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={autoReset}
                disabled={!isSuperAdmin}
                onChange={(e) => setAutoReset(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 ${!isSuperAdmin ? "opacity-60" : ""}`}
              ></div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">
                Reset Setiap Awal Tahun
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Nomor urut akan kembali ke 001 pada tanggal 1 Januari.
              </p>
            </div>
          </label>

          {isSuperAdmin && (
            <button
              onClick={handleSaveSettings}
              className="w-full mt-6 bg-white dark:bg-slate-900 border-2 border-emerald-700 text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Simpan Pengaturan
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Klasifikasi Kode Surat */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Klasifikasi Kode Surat
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Buku klasifikasi arsip kependudukan desa
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari jenis/klasifikasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none z-10">
                <tr className="bg-gray-50/80 border-b border-gray-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-28">
                    No. Kode
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">
                    Singkatan
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Jenis Surat
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-20 text-center">
                    Aktif
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono text-xs font-extrabold border border-emerald-100">
                          {item.kodeKlasifikasi || "140"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono text-xs font-bold">
                          {item.klasifikasi}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.jenis}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          disabled={!isSuperAdmin || item.isSaaSDisabled}
                          onClick={() =>
                            handleToggleVisibility(
                              item.id,
                              item.isVisible !== false,
                            )
                          }
                          title={item.isSaaSDisabled ? "Dinonaktifkan oleh Pusat (SaaS)" : ""}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${item.isVisible !== false ? "bg-emerald-500" : "bg-gray-200"} ${(!isSuperAdmin || item.isSaaSDisabled) ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform ${item.isVisible !== false ? "translate-x-4" : "translate-x-1"}`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      Tidak ada kode klasifikasi yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-emerald-50/50 border-t border-emerald-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs text-emerald-800 leading-relaxed font-bold">
                Sistem Penomoran Urut Tunggal (Global) Aktif
              </p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Sesuai kebijakan administrasi desa, nomor urut surat dihitung{" "}
                <strong>
                  berurutan secara akumulatif untuk semua jenis surat
                </strong>{" "}
                (bukan terpisah masing-masing jenis surat). Ini memastikan nomor
                surat keluar di buku agenda desa berurutan rapi tanpa duplikasi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Request SaaS Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Minta Tambah Surat
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSaaSSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Nama Lengkap Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={saasLetterName}
                onChange={(e) => setSaasLetterName(e.target.value)}
                placeholder="Contoh: SURAT KETERANGAN USAHA (SKU)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                File Contoh / Referensi (Wajib) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSaasLetterFile(e.target.files[0]);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-white dark:bg-slate-900 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              <p className="text-[10px] text-gray-500 mt-2">
                Format: PDF, Word, atau Gambar (Max. 2MB)
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm dark:shadow-none transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Kirim Pengajuan
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Elegant ConfirmModal */}
    <ConfirmModal
      isOpen={confirmState.isOpen}
      title={confirmState.title}
      message={confirmState.message}
      onConfirm={confirmState.onConfirm}
      onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      type="danger"
      confirmText="Ya, Hapus"
      cancelText="Batal"
    />
  </div>
);
}
