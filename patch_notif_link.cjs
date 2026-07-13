const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminHeader.tsx', 'utf8');

const targetMatch = `                  })
                )}
              </div>
            </div>`;

const replacement = `                  })
                )}
              </div>
              <div className="p-3 border-t border-gray-100 bg-white text-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifDropdown(false);
                    if (setActiveTab) setActiveTab('notifikasi');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors w-full py-1"
                >
                  Lihat Semua Notifikasi
                </button>
              </div>
            </div>`;

code = code.replace(targetMatch, replacement);
fs.writeFileSync('src/components/admin/AdminHeader.tsx', code);
