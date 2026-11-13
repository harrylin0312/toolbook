const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/config.js'),'utf8'),context);
assert.deepEqual(JSON.parse(JSON.stringify(context.window.CursorBuilderConfig)),JSON.parse(fs.readFileSync(path.join(root,'config/defaults.json'),'utf8')),'runtime and documented configuration stay in sync');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/manifest.json'),'utf8'));
for(const [file,sha]of Object.entries(manifest.files)){const bytes=fs.readFileSync(path.join(root,'reference',file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,file);}
const html=fs.readFileSync(path.join(root,'examples/index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(!/^(https?:|#)/.test(match[1]))assert(fs.existsSync(path.resolve(root,'examples',match[1])),match[1]);}
const css=fs.readFileSync(path.join(root,'src/builder.css'),'utf8');assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);assert(!/(^|})\s*(body|html|header|h1|\.assembly|\.stage)\s*[{,]/.test(css),'shared styles must not change host page layout');
console.log(`Passed static: matching configs, ${Object.keys(manifest.files).length} reference hashes, demo assets and scoped CSS.`);
