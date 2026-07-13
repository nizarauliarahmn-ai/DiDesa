import os
import re

dir_path = r'C:\Users\Gambar Ibung\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat'

# Regular expression to match the Search icon and input
# We'll look for <Search className="absolute..."/> followed by an <input ... /> up to />
# and wrap them in <div className="relative">...</div>.

pattern = re.compile(r'(<Search className="absolute.*?/>\s*<input[^>]*/>)', re.DOTALL)

for filename in os.listdir(dir_path):
    if filename.endswith('.tsx'):
        filepath = os.path.join(dir_path, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We only want to wrap if it's not already wrapped.
        # So we look at the lines around it. 
        # Since our previous replace in SDU was already done, SDU won't match if we make sure 
        # we only replace if there isn't already an inner relative div.
        
        # Actually, let's just use a more targeted replace.
        # Find:
        # <div className="relative">
        #   <Search className="absolute left-.../>
        #   <input ... />
        
        target_pattern = re.compile(r'(<div className="relative">\s*)(<Search className="absolute[^>]*/>\s*<input[^>]*/>)', re.DOTALL)
        
        new_content = target_pattern.sub(r'\1<div className="relative">\n                \2\n              </div>', content)
        
        # Fix indentation a bit
        new_content = new_content.replace('              </div>\n              <p', '              </div>\n              <p')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated {filename}')

