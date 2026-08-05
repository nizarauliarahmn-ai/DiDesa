export function isKadesOfficial(namaPejabat: string): boolean {
  const kadesName = (localStorage.getItem('kop_kades') || localStorage.getItem('village_kades') || 'Fazakkir Rahmad').toLowerCase().trim();
  const currentName = (namaPejabat || '').toLowerCase().trim();
  if (!currentName) return true;
  return currentName.includes(kadesName) || kadesName.includes(currentName);
}

export function resolveOfficerRole(namaPejabat: string, inputJabatan: string): string {
  const isKades = isKadesOfficial(namaPejabat);
  if (isKades) return 'Kepala Desa';

  const cleanInputRole = (inputJabatan || '').trim();
  if (cleanInputRole && cleanInputRole.toLowerCase() !== 'kepala desa' && !cleanInputRole.toLowerCase().startsWith('a.n.')) {
    return cleanInputRole;
  }

  try {
    const stored = localStorage.getItem('village_officers');
    if (stored) {
      const officers = JSON.parse(stored);
      const match = officers.find((o: any) => 
        o.name && (namaPejabat.toLowerCase().includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(namaPejabat.toLowerCase()))
      );
      if (match && match.role && match.role.toLowerCase() !== 'kepala desa') {
        return match.role;
      }
    }
  } catch (e) {}

  return cleanInputRole && cleanInputRole.toLowerCase() !== 'kepala desa' ? cleanInputRole : 'Sekretaris Desa';
}

export function getPrintSignatureHTML(
  desaName: string, 
  tglFormatted: string, 
  namaPejabat: string, 
  jabatanPejabat: string, 
  nipPejabat?: string,
  includeCamatOverride?: boolean,
  useEsignature?: boolean,
  nomorSurat?: string
): string {
  const isDual = includeCamatOverride === true;
  const isKades = isKadesOfficial(namaPejabat);
  const showTTE = useEsignature !== false;

  // Uppercase only the name part, preserving the degree
  const safeNamaPejabat = namaPejabat || '';
  const parts = safeNamaPejabat.split(',');
  const namePart = parts[0] ? parts[0].toUpperCase() : '';
  const titlePart = parts.slice(1).join(',');
  const formattedNamaPejabat = titlePart.length > 0 ? `${namePart},${titlePart}` : namePart;

  const sigLeftRoleRaw = localStorage.getItem('village_signature_left_role') || 'Camat Simpur';
  let sigLeftRole = sigLeftRoleRaw;
  if (includeCamatOverride && !sigLeftRole.toLowerCase().includes('mengetahui')) {
    sigLeftRole = `Mengetahui,\n${sigLeftRoleRaw}`;
  }

  const sigLeftName = localStorage.getItem('village_signature_left_name') || '........................';
  const sigLeftPangkat = localStorage.getItem('village_signature_left_pangkat') || '';
  const sigLeftNip = localStorage.getItem('village_signature_left_nip') || '';
  const sigAlign = localStorage.getItem('village_signature_align') || 'left'; // 'left' or 'center'
  const sigShowMeta = localStorage.getItem('village_signature_show_meta') || 'simple'; // 'simple', 'complete', 'none'
  const sigUnderline = localStorage.getItem('village_signature_underline') || 'no'; // 'yes' or 'no'

  const cleanDesaName = desaName.replace(/desa|kelurahan/gi, '').trim();

  // Right Side role text
  let rightRoleHtml = '';
  if (isKades) {
    rightRoleHtml = `Kepala Desa`;
  } else {
    const actualRole = resolveOfficerRole(namaPejabat, jabatanPejabat);
    rightRoleHtml = `a.n. Kepala Desa,<br>${actualRole}`;
  }

  const textAlign = sigAlign === 'left' ? 'left' : 'center';
  const nameDecoration = sigUnderline === 'yes' ? 'text-decoration:underline;' : 'text-decoration:none;';

  let metaHtml = '';
  if (sigShowMeta === 'simple') {
    metaHtml = `<p style="margin:0 0 5px 0;">${cleanDesaName}, ${tglFormatted}</p>`;
  } else if (sigShowMeta === 'complete' || sigShowMeta === 'yes') {
    metaHtml = `<p style="margin:0;">Dikeluarkan di : ${cleanDesaName}</p>
       <p style="margin:0 0 5px 0;border-bottom:1px solid #000;padding-bottom:5px;display:inline-block;">Pada Tanggal : ${tglFormatted}</p>`;
  }

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.')
  );
  const originUrl = isLocalhost ? window.location.origin : 'https://sistemdidesa.id';
  const cleanNomor = (nomorSurat || '').trim();
  const verifyTargetUrl = cleanNomor 
    ? `${originUrl}/?tab=verifikasi&no=${encodeURIComponent(cleanNomor)}`
    : `${originUrl}/?tab=verifikasi`;
  const verifyQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyTargetUrl)}`;

  const cleanRole = rightRoleHtml.replace(/<br\s*\/?>/gi, ' ');
  const signatureContentHtml = showTTE ? `
    <div style="border:1px solid #000;padding:6px 10px;background:#fff;display:inline-flex;align-items:center;gap:10px;text-align:left;font-family:Arial,sans-serif;max-width:330px;box-sizing:border-box;margin-top:4px;">
      <div style="flex-shrink:0;">
        <img src="${verifyQrUrl}" style="width:64px;height:64px;display:block;" />
      </div>
      <div style="flex:1;font-size:10px;line-height:1.25;color:#000;">
        <p style="margin:0 0 3px 0;font-size:9.5px;color:#000;font-weight:bold;">${cleanDesaName}, ${tglFormatted}</p>
        <p style="margin:0;font-size:8.5px;color:#333;font-weight:normal;">Ditandatangani secara elektronik oleh:</p>
        <p style="margin:2px 0 4px 0;font-weight:bold;text-transform:uppercase;font-size:10px;letter-spacing:-0.2px;">${cleanRole}</p>
        <p style="margin:0;font-weight:bold;text-transform:uppercase;font-size:10px;">${formattedNamaPejabat}</p>
        ${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? `<p style="margin:2px 0 0 0;font-size:8.5px;font-weight:normal;color:#444;">NIP. ${nipPejabat}</p>` : ''}
      </div>
    </div>
  ` : `
    <div style="height:55px;"></div>
    <p style="font-weight:bold;margin:0;${nameDecoration}">${formattedNamaPejabat}</p>
    ${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? `<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP. ${nipPejabat}</p>` : ''}
  `;

  const rightSideHtml = showTTE ? `
    <div style="text-align:${textAlign};width:330px;font-size:14px;display:inline-block;vertical-align:top;">
      ${signatureContentHtml}
    </div>
  ` : `
    <div style="text-align:${textAlign};width:320px;font-size:14px;display:inline-block;vertical-align:top;">
      ${metaHtml}
      <div style="margin-top:5px;min-height:35px;line-height:1.4;">
        ${rightRoleHtml}
      </div>
      ${signatureContentHtml}
    </div>
  `;

  if (isDual) {
    return `
      <div style="padding:0 20px;font-size:14px;margin-top:25px;page-break-inside:avoid;">
        <!-- TOP ROW (Roles) -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <!-- Left Top -->
          <div style="width:320px;text-align:${textAlign};">
            <div style="min-height:35px;line-height:1.4;white-space:pre-line;">
              ${sigLeftRole}
            </div>
            <div style="height:55px;"></div>
            <p style="font-weight:bold;margin:0;${nameDecoration}">${sigLeftName}</p>
            ${sigLeftPangkat ? `<p style="margin:2px 0 0 0;font-size:13px;">${sigLeftPangkat}</p>` : ''}
            ${sigLeftNip && sigLeftNip !== '-' && sigLeftNip !== '' ? `<p style="margin:2px 0 0 0;font-size:13px;">NIP : ${sigLeftNip}</p>` : ''}
          </div>
          <!-- Right Top -->
          <div style="width:330px;text-align:${textAlign};">
            ${rightSideHtml}
          </div>
        </div>
      </div>
    `;
  } else {
    // Single signee on the right
    return `
      <div style="display:flex;justify-content:flex-end;margin-top:25px;page-break-inside:avoid;">
        ${rightSideHtml}
      </div>
    `;
  }
}

/**
 * Renders signature block in a React JSX component (e.g. for preview panels).
 */
export function getReactSignaturePreview(
  desaName: string,
  tglFormatted: string,
  namaPejabat: string,
  jabatanPejabat: string,
  nipPejabat?: string,
  includeCamatOverride?: boolean,
  useEsignature?: boolean
) {
  const isDual = includeCamatOverride === true;
  const isKades = isKadesOfficial(namaPejabat);
  const showTTE = useEsignature !== false;

  const sigLeftRoleRaw = localStorage.getItem('village_signature_left_role') || 'Camat Simpur';
  let sigLeftRole = sigLeftRoleRaw;
  if (includeCamatOverride && !sigLeftRole.toLowerCase().includes('mengetahui')) {
    sigLeftRole = `Mengetahui,\n${sigLeftRoleRaw}`;
  }

  const sigLeftName = localStorage.getItem('village_signature_left_name') || '........................';
  const sigLeftPangkat = localStorage.getItem('village_signature_left_pangkat') || '';
  const sigLeftNip = localStorage.getItem('village_signature_left_nip') || '';
  const sigAlign = localStorage.getItem('village_signature_align') || 'left'; // 'left' or 'center'
  const sigShowMeta = localStorage.getItem('village_signature_show_meta') || 'simple'; // 'simple', 'complete', 'none'
  const sigUnderline = localStorage.getItem('village_signature_underline') || 'no'; // 'yes' or 'no'

  const cleanDesaName = desaName.replace(/desa|kelurahan/gi, '').trim();

  let rightRole = '';
  if (isKades) {
    rightRole = `Kepala Desa`;
  } else {
    const actualRole = resolveOfficerRole(namaPejabat, jabatanPejabat);
    rightRole = `a.n. Kepala Desa,\n${actualRole}`;
  }

  return {
    isDual,
    sigLeftRole,
    sigLeftName,
    sigLeftPangkat,
    sigLeftNip,
    cleanDesaName,
    sigAlign,
    sigShowMeta,
    sigUnderline,
    rightRole,
    showTTE
  };
}
