const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div className="grid grid-cols-2 gap-4 mt-8">[\s\S]*?\{\/\* End Signature Mock Layout \*\/\}/;

const newBlock = `<div className="mt-8 flex flex-col justify-between">
                          {/* TOP ROW (Roles) */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left Side Top */}
                            <div>
                              {(sigFormat === 'kades_camat' || sigFormat === 'kades_bpd') ? (
                                <div className={previewAlignClass}>
                                  <div className="invisible">
                                    {sigShowMeta === 'simple' ? (
                                      <p className="m-0 text-xs mb-2">&nbsp;</p>
                                    ) : (sigShowMeta === 'complete' || sigShowMeta === 'yes') ? (
                                      <div className="mb-2">
                                        <p className="m-0 text-xs">&nbsp;</p>
                                        <p className="m-0 pb-0.5 mb-2 text-xs inline-block">&nbsp;</p>
                                      </div>
                                    ) : <p className="m-0 text-xs mb-2">&nbsp;</p>}
                                  </div>
                                  <div className={\`mt-1 whitespace-pre-line leading-relaxed min-h-[40px] \${previewAlignClass}\`}>
                                    {sigLeftRole}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-left text-gray-300 italic font-sans text-[11px] pt-4">
                                  (Kosong)
                                </div>
                              )}
                            </div>

                            {/* Right Side Top */}
                            <div className={previewAlignClass}>
                              {sigShowMeta === 'simple' && (
                                <p className={\`m-0 text-xs mb-2 \${previewAlignClass}\`}>
                                  {villageName.replace(/desa|kelurahan/gi, '').trim()}, {new Date().getDate()} {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][new Date().getMonth()]} {new Date().getFullYear()}
                                </p>
                              )}
                              {(sigShowMeta === 'complete' || sigShowMeta === 'yes') && (
                                <div className="mb-2">
                                  <p className="m-0 text-xs">Dikeluarkan di : {villageName.replace(/desa|kelurahan/gi, '').trim()}</p>
                                  <p className="m-0 border-b border-gray-300 pb-0.5 mb-2 text-xs inline-block">Pada Tanggal : {new Date().getDate()} {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][new Date().getMonth()]} {new Date().getFullYear()}</p>
                                </div>
                              )}
                              <div className={\`mt-1 min-h-[40px] leading-relaxed text-xs \${previewAlignClass}\`}>
                                {(() => {
                                  if (sigFormat === 'an') {
                                    return (
                                      <>
                                        a.n. Kepala Desa {villageName.replace(/desa|kelurahan/gi, '').trim()},<br/>
                                        Sekretaris Desa
                                      </>
                                    );
                                  } else {
                                    return \`Kepala Desa \${villageName.replace(/desa|kelurahan/gi, '').trim()}\`;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-14"></div>
                          
                          {/* BOTTOM ROW (Names) */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left Side Bottom */}
                            <div>
                              {(sigFormat === 'kades_camat' || sigFormat === 'kades_bpd') && (
                                <div className={previewAlignClass}>
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
                              )}
                            </div>

                            {/* Right Side Bottom */}
                            <div className={previewAlignClass}>
                              <p className={\`font-bold uppercase tracking-wide decoration-1 \${previewUnderlineClass} \${previewAlignClass}\`}>
                                {sigFormat === 'an' ? 'M. RASYID' : 'FAZAKKIR RAHMAD'}
                              </p>
                              <p className={\`text-[10px] font-mono mt-0.5 text-gray-700 \${previewAlignClass}\`}>NIP. 19800101 200501 1 001</p>
                            </div>
                          </div>
                        </div>
                    {/* End Signature Mock Layout */}`;

content = content.replace(regex, newBlock);
fs.writeFileSync(file, content, 'utf8');
