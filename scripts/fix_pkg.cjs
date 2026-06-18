const fs = require('fs');
let c = fs.readFileSync('package.json', 'utf8');
c = c.replace(/^\uFEFF/, '');
c = c.replace(
  '"@discordjs/voice": "^0.19.2",',
  '"@discordjs/voice": "^0.19.2",\n    "edge-tts": "^6.1.0",'
);
fs.writeFileSync('package.json', c, 'utf8');
console.log('OK: edge-tts added to package.json');
