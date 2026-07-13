const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

const targetMatch = `    const printWindow = window.open('', '_blank');
    if (!printWindow) return;`;
const replacement = `    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const printWindow = iframe.contentWindow;
    if (!printWindow) return;`;

code = code.replace(targetMatch, replacement);

const printMatch = `    printWindow.document.write(html);
    printWindow.document.close();
    setShowPrintModal(false);
  };`;
const printReplacement = `    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
    
    setShowPrintModal(false);
  };`;
code = code.replace(printMatch, printReplacement);

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
