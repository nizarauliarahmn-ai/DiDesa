const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AspirasiWarga.tsx', 'utf8');

const effectCode = `  React.useEffect(() => {
    const handleUpdate = () => {
      if (ticketSearch.trim() && searchAttempted) {
        const allAspirasi = getAspirasi();
        const found = allAspirasi.find(a => a.id.toLowerCase() === ticketSearch.trim().toLowerCase());
        setTrackedTicket(found || null);
      }
    };
    window.addEventListener('didesa_aspirasi_updated', handleUpdate);
    return () => window.removeEventListener('didesa_aspirasi_updated', handleUpdate);
  }, [ticketSearch, searchAttempted]);`;

if (!code.includes('didesa_aspirasi_updated')) {
  const insertPoint = `  const handleSearchTicket = () => {`;
  code = code.replace(insertPoint, effectCode + "\n\n" + insertPoint);
  fs.writeFileSync('src/components/dashboard/AspirasiWarga.tsx', code);
}
