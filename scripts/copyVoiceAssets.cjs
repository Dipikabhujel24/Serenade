const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'serenade', 'assets', 'audio');
const mapping = [
  { src: 'brother.mp3', dest: 'male_nepali.mp3' },
  { src: 'mom.mp3', dest: 'female_nepali.mp3' },
];

let did = false;
for (const m of mapping) {
  const src = path.join(srcDir, m.src);
  const dest = path.join(srcDir, m.dest);
  try {
    if (!fs.existsSync(src)) {
      console.warn('Source not found:', src);
      continue;
    }
    if (fs.existsSync(dest)) {
      console.log('Destination already exists:', dest);
      did = true;
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log('Copied', src, '->', dest);
    did = true;
  } catch (e) {
    console.error('Failed to copy', src, '->', dest, e.message);
  }
}
if (!did) process.exitCode = 1;
else process.exitCode = 0;
