const fs = require('fs');

const files = [
  'src/components/admin/surat/AdminSuratBuat.tsx',
  'src/components/admin/surat/AdminSuratDashboard.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace from `const rightSideJSX = (` to the end of `renderReactSignature` function.
  // The end is marked by `};` followed by `const componentRef` or similar.

  const oldBlockRegex = /const rightSideJSX = \([\s\S]*?if \(sig\.isDual\) \{[\s\S]*?return \([\s\S]*?\}\s*};\n/m;
  
  const newBlock = `const rightSideJSX = (
      <div className={\`w-[230px] inline-block align-top text-black \${textAlignClass}\`}>
        {sig.sigShowMeta === 'simple' && (
          <p className="m-0 text-xs mb-2">{sig.cleanDesaName}, {tglFormatted}</p>
        )}
        {(sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') && (
          <div className="mb-2">
            <p className="m-0 text-xs">Dikeluarkan di : {sig.cleanDesaName}</p>
            <p className="m-0 border-b border-black pb-0.5 mb-2 text-xs inline-block">Pada Tanggal : {tglFormatted}</p>
          </div>
        )}
        <div className={\`min-h-[45px] leading-relaxed mb-14 text-xs mt-1 \${textAlignClass}\`}>
          {sig.rightRole.split('\\n').map((line, idx) => (
            <React.Fragment key={idx}>{line}<br /></React.Fragment>
          ))}
        </div>
        <p className={\`font-bold uppercase text-xs m-0 decoration-1 \${nameUnderlineClass} \${textAlignClass}\`}>{namaPejabat}</p>
        {nipPejabat && nipPejabat !== '-' && nipPejabat !== '' && (
          <p className={\`text-[10px] font-mono mt-0.5 text-gray-700 m-0 \${textAlignClass}\`}>NIP. {nipPejabat}</p>
        )}
      </div>
    );

    if (sig.isDual) {
      return (
        <div className="mt-8 px-4 text-black">
          {/* TOP ROW (Roles) */}
          <div className="flex justify-between">
            {/* Left Top */}
            <div className={\`w-[230px] \${textAlignClass}\`}>
              <div className="invisible">
                {sig.sigShowMeta === 'simple' ? (
                  <p className="m-0 text-xs mb-2">&nbsp;</p>
                ) : (sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') ? (
                  <div className="mb-2">
                    <p className="m-0 text-xs">&nbsp;</p>
                    <p className="m-0 pb-0.5 mb-2 text-xs inline-block">&nbsp;</p>
                  </div>
                ) : <p className="m-0 text-xs mb-2">&nbsp;</p>}
              </div>
              <div className={\`mt-1 min-h-[45px] leading-relaxed text-xs whitespace-pre-line \${textAlignClass}\`}>
                {sig.sigLeftRole}
              </div>
            </div>
            
            {/* Right Top */}
            <div className={\`w-[230px] \${textAlignClass}\`}>
              {sig.sigShowMeta === 'simple' && (
                <p className="m-0 text-xs mb-2">{sig.cleanDesaName}, {tglFormatted}</p>
              )}
              {(sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') && (
                <div className="mb-2">
                  <p className="m-0 text-xs">Dikeluarkan di : {sig.cleanDesaName}</p>
                  <p className="m-0 border-b border-black pb-0.5 mb-2 text-xs inline-block">Pada Tanggal : {tglFormatted}</p>
                </div>
              )}
              <div className={\`min-h-[45px] leading-relaxed text-xs mt-1 \${textAlignClass}\`}>
                {sig.rightRole.split('\\n').map((line, idx) => (
                  <React.Fragment key={idx}>{line}<br /></React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* SPACE FOR SIGNATURE */}
          <div className="h-14"></div>

          {/* BOTTOM ROW (Names) */}
          <div className="flex justify-between">
            {/* Left Bottom */}
            <div className={\`w-[230px] \${textAlignClass}\`}>
              <p className={\`font-bold text-xs m-0 decoration-1 \${nameUnderlineClass} \${textAlignClass}\`}>{sig.sigLeftName}</p>
              {sig.sigLeftPangkat && (
                <p className={\`text-[11px] mt-0.5 text-gray-800 m-0 \${textAlignClass}\`}>{sig.sigLeftPangkat}</p>
              )}
              {sig.sigLeftNip && sig.sigLeftNip !== '-' && (
                <p className={\`text-[11px] mt-0.5 text-gray-800 m-0 \${textAlignClass}\`}>NIP : {sig.sigLeftNip}</p>
              )}
            </div>

            {/* Right Bottom */}
            <div className={\`w-[230px] \${textAlignClass}\`}>
              <p className={\`font-bold uppercase text-xs m-0 decoration-1 \${nameUnderlineClass} \${textAlignClass}\`}>{namaPejabat}</p>
              {nipPejabat && nipPejabat !== '-' && nipPejabat !== '' && (
                <p className={\`text-[10px] font-mono mt-0.5 text-gray-700 m-0 \${textAlignClass}\`}>NIP. {nipPejabat}</p>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-8 flex justify-end text-black">
          {rightSideJSX}
        </div>
      );
    }
  };\n`;

  content = content.replace(oldBlockRegex, newBlock);
  fs.writeFileSync(file, content, 'utf8');
}
