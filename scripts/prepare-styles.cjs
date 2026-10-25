// Run after editing CSS. Content hashes keep deployments and browser caches in sync.
const fs = require('node:fs');
const crypto = require('node:crypto');
for (const page of ['dist/index.html','dist/work/index.html']) {
  const files = ['style','motion','portfolio','refined',...(page==='dist/index.html'?['reviews','carousel']:[])];
  const css = files.map(name=>fs.readFileSync(`dist/${name}.css`,'utf8')).join('\n');
  const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0,12);
  const bundle = `${page==='dist/index.html'?'site':'work'}-${hash}.css`;
  fs.writeFileSync(`dist/${bundle}`,css);
  let html = fs.readFileSync(page,'utf8');
  html=html.replace(/<link rel="stylesheet" href="\/(?:style|motion|portfolio|refined|reviews|carousel|site-[a-f0-9]+|work-[a-f0-9]+)\.css">/g,'');
  html=html.replace('</head>',`<link rel="stylesheet" href="/${bundle}"></head>`);
  fs.writeFileSync(page,html);
}
