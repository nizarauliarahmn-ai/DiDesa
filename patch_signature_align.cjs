const fs = require('fs');
let file = 'src/utils/signature.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the rightSideHtml and isDual block in getPrintSignatureHTML
const blockStart = "const rightSideHtml = `";
const blockEnd = "Single signee on the right";

// We'll just replace everything from `const rightSideHtml` down to `}` of the function.
// First, find the exact substring to replace.
const replaceRegex = /const rightSideHtml = `[\s\S]*?Single signee on the right[\s\S]*?return `[\s\S]*?`;\n  }\n\}/;

const newBlock = `const rightSideHtml = \`
    <div style="text-align:\${textAlign};width:230px;font-size:14px;display:inline-block;vertical-align:top;">
      \${metaHtml}
      <div style="margin-bottom:55px;margin-top:5px;min-height:35px;line-height:1.4;">
        \${rightRoleHtml}
      </div>
      <p style="font-weight:bold;margin:0;text-transform:uppercase;\${nameDecoration}">\${namaPejabat}</p>
      \${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? \\\`<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP. \${nipPejabat}</p>\\\` : ''}
    </div>
  \`;

  if (isDual) {
    return \`
      <div style="padding:0 20px;font-size:14px;margin-top:25px;page-break-inside:avoid;">
        <!-- TOP ROW (Roles) -->
        <div style="display:flex;justify-content:space-between;">
          <!-- Left Top -->
          <div style="width:230px;text-align:\${textAlign};">
            <div style="visibility:hidden;">\${metaHtml || '<p style="margin:0 0 5px 0;">&nbsp;</p>'}</div>
            <div style="margin-top:5px;min-height:35px;line-height:1.4;white-space:pre-line;">
              \${sigLeftRole}
            </div>
          </div>
          <!-- Right Top -->
          <div style="width:230px;text-align:\${textAlign};">
            \${metaHtml}
            <div style="margin-top:5px;min-height:35px;line-height:1.4;">
              \${rightRoleHtml}
            </div>
          </div>
        </div>

        <!-- SPACE FOR SIGNATURE -->
        <div style="height:60px;"></div>

        <!-- BOTTOM ROW (Names) -->
        <div style="display:flex;justify-content:space-between;">
          <!-- Left Bottom -->
          <div style="width:230px;text-align:\${textAlign};">
            <p style="font-weight:bold;margin:0;\${nameDecoration}">\${sigLeftName}</p>
            \${sigLeftPangkat ? \\\`<p style="margin:2px 0 0 0;font-size:13px;">\${sigLeftPangkat}</p>\\\` : ''}
            \${sigLeftNip && sigLeftNip !== '-' && sigLeftNip !== '' ? \\\`<p style="margin:2px 0 0 0;font-size:13px;">NIP : \${sigLeftNip}</p>\\\` : ''}
          </div>
          <!-- Right Bottom -->
          <div style="width:230px;text-align:\${textAlign};">
            <p style="font-weight:bold;margin:0;text-transform:uppercase;\${nameDecoration}">\${namaPejabat}</p>
            \${nipPejabat && nipPejabat !== '-' && nipPejabat !== '' ? \\\`<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP. \${nipPejabat}</p>\\\` : ''}
          </div>
        </div>
      </div>
    \`;
  } else {
    // Single signee on the right
    return \`
      <div style="display:flex;justify-content:flex-end;margin-top:25px;page-break-inside:avoid;">
        \${rightSideHtml}
      </div>
    \`;
  }
}`;

content = content.replace(replaceRegex, newBlock);

fs.writeFileSync(file, content, 'utf8');
