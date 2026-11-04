const {buildSync} = require('esbuild');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const result = buildSync({entryPoints:['src/experience.js'],bundle:true,minify:true,format:'esm',target:['safari15','chrome100','firefox100'],legalComments:'inline',write:false});
const code = result.outputFiles[0].contents;
const name = `experience-${createHash('sha256').update(code).digest('hex').slice(0,12)}.js`;
fs.writeFileSync(`dist/${name}`,code);
const loader = fs.readFileSync('dist/motion.js','utf8').replace(/import\('\/(?:experience|experience-[a-f0-9]+)\.js'\)/,`import('/${name}')`);
fs.writeFileSync('dist/motion.js',loader);
