/**
 * Utility for generating standardized print signature HTML blocks based on Super Admin custom configurations.
 */

export function getPrintSignatureHTML(
  desaName: string, 
  tglFormatted: string, 
  namaPejabat: string, 
  jabatanPejabat: string, 
  nipPejabat?: string,
  includeCamatOverride?: boolean
): string {
  const isDual = includeCamatOverride === true;
  const isAn = jabatanPejabat.toLowerCase() !== 'kepala desa';

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
  if (isAn) {
    rightRoleHtml = `a.n. Kepala Desa ${cleanDesaName},<br>${jabatanPejabat}`;
  } else {
    rightRoleHtml = `Kepala Desa ${cleanDesaName}`;
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

  const rightSideHtml = `
    <div style="text-align:${textAlign};width:230px;font-size:14px;display:inline-block;vertical-align:top;">
      ${metaHtml}
      <div style="margin-bottom:55px;margin-top:5px;min-height:35px;line-height:1.4;">
        ${rightRoleHtml}
      </div>
      <p style="font-weight:bold;margin:0;text-transform:uppercase;${nameDecoration}">${namaPejabat}</p>
      ${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? `<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP. ${nipPejabat}</p>` : ''}
    </div>
  `;

  if (isDual) {
    return `
      <div style="padding:0 20px;font-size:14px;margin-top:25px;page-break-inside:avoid;">
        <!-- TOP ROW (Roles) -->
        <div style="display:flex;justify-content:space-between;">
          <!-- Left Top -->
          <div style="width:230px;text-align:${textAlign};">
            <div style="min-height:35px;line-height:1.4;white-space:pre-line;">
              ${sigLeftRole}
            </div>
          </div>
          <!-- Right Top -->
          <div style="width:230px;text-align:${textAlign};">
            ${metaHtml}
            <div style="margin-top:5px;min-height:35px;line-height:1.4;">
              ${rightRoleHtml}
            </div>
          </div>
        </div>

        <!-- SPACE FOR SIGNATURE -->
        <div style="height:60px;"></div>

        <!-- BOTTOM ROW (Names) -->
        <div style="display:flex;justify-content:space-between;">
          <!-- Left Bottom -->
          <div style="width:230px;text-align:${textAlign};">
            <p style="font-weight:bold;margin:0;${nameDecoration}">${sigLeftName}</p>
            ${sigLeftPangkat ? `<p style="margin:2px 0 0 0;font-size:13px;">${sigLeftPangkat}</p>` : ''}
            ${sigLeftNip && sigLeftNip !== '-' && sigLeftNip !== '' ? `<p style="margin:2px 0 0 0;font-size:13px;">NIP : ${sigLeftNip}</p>` : ''}
          </div>
          <!-- Right Bottom -->
          <div style="width:230px;text-align:${textAlign};">
            <p style="font-weight:bold;margin:0;text-transform:uppercase;${nameDecoration}">${namaPejabat}</p>
            ${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? `<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP. ${nipPejabat}</p>` : ''}
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
  includeCamatOverride?: boolean
) {
  const isDual = includeCamatOverride === true;
  const isAn = jabatanPejabat.toLowerCase() !== 'kepala desa';

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
    rightRole: isAn ? `a.n. Kepala Desa ${cleanDesaName},\\n${jabatanPejabat}` : `Kepala Desa ${cleanDesaName}`
  };
}
