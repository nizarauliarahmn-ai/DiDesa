using System;
using System.IO;
using System.Text.RegularExpressions;

class Program
{
    static void Main()
    {
        string path = @"C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx";
        string content = File.ReadAllText(path);

        string oldText = @"              </div>
              </div>
            </div>
<div className=""md:col-span-2 space-y-2"">
                <label className=""text-sm font-bold text-slate-700 dark:text-slate-300"">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder=""Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir""
                  className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none""
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>";

        string newText = @"            </div>
            <div className=""grid grid-cols-1 md:grid-cols-4 gap-4"">
              <div className=""md:col-span-2 space-y-2"">
                <label className=""text-sm font-bold text-slate-700 dark:text-slate-300"">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder=""Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir""
                  className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none""
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>
              <div className=""md:col-span-1 space-y-2"">
                <label className=""text-sm font-bold text-slate-700 dark:text-slate-300"">RT</label>
                {rtList.length > 0 ? (
                  <select
                    className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none""
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                  >
                    <option value="""">Pilih RT</option>
                    {rtList.map((rt, i) => <option key={i} value={rt.no}>{rt.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type=""text""
                    className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none""
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    placeholder=""Contoh: 001""
                  />
                )}
              </div>
              <div className=""md:col-span-1 space-y-2"">
                <label className=""text-sm font-bold text-slate-700 dark:text-slate-300"">RW</label>
                {rwList.length > 0 ? (
                  <select
                    className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none""
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                  >
                    <option value="""">Pilih RW</option>
                    {rwList.map((rw, i) => <option key={i} value={rw.no}>{rw.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type=""text""
                    className=""w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none""
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    placeholder=""Contoh: 002""
                  />
                )}
              </div>
            </div>";

        if (content.Contains(oldText))
        {
            content = content.Replace(oldText, newText);
            File.WriteAllText(path, content);
            Console.WriteLine("SUCCESS: SKTM updated");
        }
        else
        {
            Console.WriteLine("NOT FOUND");
            // Debug: show what we're looking for
            int idx = content.IndexOf("grid grid-cols-2 gap-4");
            if (idx >= 0)
            {
                int start = Math.Max(0, idx - 100);
                int end = Math.Min(content.Length, idx + 1000);
                string snippet = content.Substring(start, end - start);
                Console.WriteLine("Found grid at index: " + idx);
                Console.WriteLine("Context: " + snippet.Substring(0, Math.Min(500, snippet.Length)));
            }
        }
    }
}