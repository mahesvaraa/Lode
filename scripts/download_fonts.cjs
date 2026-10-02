const fs = require('fs');
const path = require('path');

async function download() {
  const url = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const css = await res.text();

  const fontDir = path.join(__dirname, '..', 'src', 'assets', 'fonts');
  fs.mkdirSync(fontDir, { recursive: true });

  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;
  let localCss = '';
  const seen = new Set();

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = /font-family:\s*['"]?([^'";]+)['"]?/.exec(block);
    const weightMatch = /font-weight:\s*([^;]+)/.exec(block);
    const styleMatch = /font-style:\s*([^;]+)/.exec(block) || [, 'normal'];
    const urlMatch = /url\((https:\/\/[^)]+)\)/.exec(block);

    if (familyMatch && weightMatch && urlMatch) {
      const family = familyMatch[1].trim();
      const weight = weightMatch[1].trim();
      const style = styleMatch[1].trim();
      const fontUrl = urlMatch[1];
      const key = `${family}-${weight}-${style}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const fontFileName = (family.toLowerCase().replace(/\s+/g, '-')) + '-' + weight + '-' + style + '.woff2';
      const fontFilePath = path.join(fontDir, fontFileName);

      const fontRes = await fetch(fontUrl);
      const fontBuffer = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(fontFilePath, fontBuffer);

      localCss += `@font-face {\n  font-family: '${family}';\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url('./${fontFileName}') format('woff2');\n}\n\n`;
    }
  }

  fs.writeFileSync(path.join(fontDir, 'fonts.css'), localCss);
}

if (require.main === module) {
  download().catch(console.error);
}
