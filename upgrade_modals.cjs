const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;

  // Add slide-in animation to fixed inset-0 elements that don't have AnimatePresence
  // Actually, let's just find <div className="fixed inset-0...
  // and make sure it has standard tailwind animate-in classes if it's a modal container
  
  // We look for modal container patterns
  code = code.replace(/className="fixed inset-0([\s\S]*?)flex items-center justify-center([\s\S]*?)"/g, (match, p1, p2) => {
    // If it already has animate-in, just return
    if (match.includes('animate-in')) {
      return match.replace(/animate-in [\w\-\s]+/g, 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out');
    }
    
    // Check if it's already a motion component
    if (code.includes('motion.div') && match.includes('<motion')) return match;
    
    return `className="fixed inset-0${p1}flex items-center justify-center${p2} animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out"`;
  });

  if (code !== originalCode) {
    fs.writeFileSync(file, code);
  }
});

