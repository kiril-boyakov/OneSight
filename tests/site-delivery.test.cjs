const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('public pages load one local stylesheet, local fonts, and correct production metadata',()=>{
 for(const path of ['dist/index.html','dist/work/index.html']){
  const html=fs.readFileSync(path,'utf8');
  const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)];
  assert.equal(sheets.length,1);
  const css=fs.readFileSync('dist'+sheets[0][1],'utf8');
  assert.ok(!css.includes('@import'));
  for(const [,asset]of css.matchAll(/url\((\/assets\/[^)]+)\)/g))assert.ok(fs.existsSync('dist'+asset));
  assert.match(html,/<link rel="canonical" href="https:\/\/1sight.eu\//);
  assert.ok(!html.includes('noindex,nofollow'));
  assert.match(css,/\.cinema-reveal,\.cinema-reveal\.is-visible,\.cinema-reveal:focus-within\{opacity:1;clip-path:none;transform:none;transition:none\}/);
 }
});
test('public sitemap and robots allow discovery while excluding admin',()=>{
 const robots=fs.readFileSync('dist/robots.txt','utf8');
 assert.ok(!/^Disallow: \/$/m.test(robots));assert.match(robots,/Disallow: \/admin\//);
 assert.match(fs.readFileSync('dist/sitemap.xml','utf8'),/https:\/\/1sight.eu\/work\//);
 assert.match(fs.readFileSync('dist/admin/index.html','utf8'),/noindex/);
});

test('both pages expose complete raster previews and descriptions without JavaScript',()=>{
 for(const path of ['dist/index.html','dist/work/index.html']){
  const html=fs.readFileSync(path,'utf8');
  const meta=Object.fromEntries([...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)].map(m=>[m[1],m[2]]));
  for(const key of ['description','og:description','twitter:description'])assert.ok(meta[key].length>60);
  assert.equal(meta['og:image'],meta['twitter:image']);assert.match(meta['og:image'],/^https:\/\/1sight\.eu\/.*\.png$/);
  const image=fs.readFileSync('dist/'+meta['og:image'].split('/').pop());
  assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
  assert.equal(meta['og:image:type'],'image/png');assert.ok(meta.robots.includes('max-image-preview:large'));
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(data['@graph'].some(node=>node['@type']==='WebPage' && node.primaryImageOfPage.url===meta['og:image']));
 }
});
