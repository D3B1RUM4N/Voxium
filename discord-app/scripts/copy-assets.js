const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

// Clean and recreate dist
if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true });
}
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, 'src'), { recursive: true });

// Copy index.html
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));

// Copy all files from src/
const srcDir = path.join(root, 'src');
for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.join(srcDir, file);
    if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, path.join(dist, 'src', file));
    }
}

console.log('✅ Frontend assets copied to dist/');
