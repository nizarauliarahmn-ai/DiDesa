const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* Signature Mock Layout \*\/\}([\s\S]*?)<div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 leading-relaxed">/;

const newLayout = `{/* Signature Mock Layout */}
                    {(() => {
                      const previewAlignClass = sigAlign === 'left' ? 'text-left' : 'text-center';
                      const previewUnderlineClass = sigUnderline === 'yes' ? 'underline' : 'no-underline';
                      return (
                        <div className="mt-8 flex flex-col justify-between">
                          {/* TOP ROW (Roles) */}
                          <div className="flex justify-between gap-4">
                            {/* Left Side Top */}
                            <div className={\`w-1/2 \${previewAlignClass}\`}>
                                <div className="invisible">
                                  {sigShowMeta === 'simple' ? (
                                    <p className="m-0 text-xs mb-2">&nbsp;</p>
                                  ) : (sigShowMeta === 'complete' || sigShowMeta === 'yes') ? (
                                    <div className="mb-2 text-xs">
                                      <p className="m-0">&nbsp;</p>
                                      <p className="m-0 border-b border-transparent pb-0.5 mb-2 inline-block">&nbsp;</p>
                                    </div>
                                  ) : null}
                                </div>
                                <div className={\`mt-1 whitespace-pre-line leading-relaxed min-h-[40px] \${previewAlignClass}\`}>
                                  {sigLeftRole}
                                </div>
                            </div>

                            {/* Right Side Top */}
                            <div className={\`w-1/2 \${previewAlignClass}\`}>
                              {sigShowMeta === 'simple' && (
                                <p className={\`m-0 text-xs mb-2 \${previewAlignClass}\`}>
                                  {villageName.replace(/desa|kelurahan/gi, '').trim()}, {new Date().getDate()} {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][new Date().getMonth()]} {new Date().getFullYear()}
                                </p>
                              )}
                              {(sigShowMeta === 'complete' || sigShowMeta === 'yes') && (
                                <div className="mb-2 text-xs">
                                  <p className="m-0">Dikeluarkan di : {villageName.replace(/desa|kelurahan/gi, '').trim()}</p>
                                  <p className="m-0 border-b border-gray-300 pb-0.5 mb-2 inline-block">Pada Tanggal : {new Date().getDate()} {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][new Date().getMonth()]} {new Date().getFullYear()}</p>
                                </div>
                              )}
                              <div className={\`mt-1 min-h-[40px] leading-relaxed text-xs \${previewAlignClass}\`}>
                                \`Kepala Desa \${villageName.replace(/desa|kelurahan/gi, '').trim()}\`
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-14"></div>
                          
                          {/* BOTTOM ROW (Names) */}
                          <div className="flex justify-between gap-4">
                            {/* Left Side Bottom */}
                            <div className={\`w-1/2 \${previewAlignClass}\`}>
                                  <p className={\`font-bold tracking-wide decoration-1 \${previewUnderlineClass} \${previewAlignClass}\`}>
                                    {sigLeftName}
                                  </p>
                                  {sigLeftPangkat && (
                                    <p className={\`text-[11px] mt-0.5 text-gray-800 \${previewAlignClass}\`}>{sigLeftPangkat}</p>
                                  )}
                                  {sigLeftNip && sigLeftNip !== '-' && (
                                    <p className={\`text-[11px] mt-0.5 text-gray-800 \${previewAlignClass}\`}>NIP : {sigLeftNip}</p>
                                  )}
                            </div>

                            {/* Right Side Bottom */}
                            <div className={\`w-1/2 \${previewAlignClass}\`}>
                              <p className={\`font-bold uppercase tracking-wide decoration-1 \${previewUnderlineClass} \${previewAlignClass}\`}>
                                {namaKades}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 leading-relaxed">
`;

content = content.replace(regex, newLayout);
fs.writeFileSync(file, content, 'utf8');
