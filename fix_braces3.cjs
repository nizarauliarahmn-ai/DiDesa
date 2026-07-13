const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', 'utf8');

// Fix handleAppendVariable
code = code.replace(`    });
  };

  showToast(\`Ditambahkan \${variableCode} ke format!\`, "success");
}`, `    });
    showToast(\`Ditambahkan \${variableCode} ke format!\`, "success");
  };`);

// For some reason all functions starting with handleSaveSettings are outside the component scope! 
// This is because handleAppendVariable was prematurely closed by the `}` below the showToast, which closed the component instead.
// Wait, no, the closing brace in handleAppendVariable above looks like this:
//  };
//
//  showToast(`Ditambahkan ${variableCode} ke format!`, "success");
//}

// Let's remove the extra closing brace below showToast and fix handleAppendVariable.

code = code.replace(`    });
  };

  showToast(\`Ditambahkan \${variableCode} ke format!\`, "success");
}`, `    });
    showToast(\`Ditambahkan \${variableCode} ke format!\`, "success");
  };`);

fs.writeFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', code);
console.log("Fixed handleAppendVariable and component brace");
