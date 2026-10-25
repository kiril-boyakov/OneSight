// Optional artwork regeneration: requires sharp. The generated PNGs are committed.
const fs=require('node:fs');
const sharp=require('sharp');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function artwork(lines){return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#151515"/><path d="M64 150H1136M64 521H1136" stroke="#48463f"/><text x="64" y="107" fill="#f4f2ec" font-family="Arial,sans-serif" font-size="58" font-weight="700" letter-spacing="-3">onesight<tspan fill="#e83024" font-size="24" dy="-26">®</tspan></text><text x="1136" y="100" text-anchor="end" fill="#bab7ad" font-family="Arial,sans-serif" font-size="18" letter-spacing="2">1SIGHT.EU</text>${lines.map((line,i)=>`<text x="64" y="${288+i*88}" fill="${i?'#e83024':'#f4f2ec'}" font-family="Arial,sans-serif" font-size="72" font-weight="700" letter-spacing="-3">${escape(line)}</text>`).join('')}<g transform="translate(895 219) rotate(7 100 110)"><rect width="210" height="250" fill="#e83024"/><g stroke="#151515" stroke-width="4" fill="none"><path d="M24 63V27H59M151 27H186V63M24 187V223H59M151 223H186V187"/><circle cx="105" cy="125" r="51"/><circle cx="105" cy="125" r="13" fill="#151515"/></g></g><text x="64" y="575" fill="#f4f2ec" font-family="Arial,sans-serif" font-size="21" letter-spacing="3">WEB DESIGN &amp; DEVELOPMENT</text><text x="1136" y="575" text-anchor="end" fill="#bab7ad" font-family="Arial,sans-serif" font-size="17">A fresh perspective.</text></svg>`;}
(async()=>{
 await sharp(Buffer.from(artwork(['Websites with','a point of view.']))).png().toFile('dist/onesight-preview.png');
 await sharp(Buffer.from(artwork(['Different ideas.','One perspective.']))).png().toFile('dist/onesight-work-preview.png');
 const icon=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="72" fill="#e83024"/><g stroke="#151515" stroke-width="15" fill="none"><path d="M85 170V85H170M342 85H427V170M85 342V427H170M342 427H427V342"/><circle cx="256" cy="256" r="90"/><circle cx="256" cy="256" r="22" fill="#151515"/></g></svg>');
 await sharp(icon).png().toFile('dist/onesight-icon.png');
 await sharp(icon).resize(180,180).png().toFile('dist/apple-touch-icon.png');
 await sharp(icon).resize(48,48).png().toFile('dist/favicon-48.png');
})();
