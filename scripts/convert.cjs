const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),XLSX=require('xlsx');
const root=path.resolve(__dirname,'..'),data=path.join(root,'data');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const save=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v));};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n').replace(/^\s*init\(\);\s*$/gm,'');
const sandbox={XLSX,console,Map,Set,Date,Intl,URL,Blob,setTimeout,clearTimeout,setInterval,clearInterval,document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];}},localStorage:{getItem(){return null;}},navigator:{},location:{},addEventListener(){}};
sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(source+'\n globalThis.parsers={isWasteFile,isJfmFile,parseSummaryFromWB,parseDetailsFromWB,parseHalfDetailsFromWB,parseReasonFromWB,parseTop20FromWB};',sandbox,{timeout:15000});
const p=sandbox.parsers,parserHash=hash(source),keys=['summary','details','halfDetails','reasonWeeks','top20Entries'];
function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(e.name.startsWith('.')||e.name.startsWith('~$'))return [];const f=path.join(dir,e.name);return e.isDirectory()?scan(f):e.isFile()&&/\.xlsx$/i.test(e.name)?[path.relative(data,f).split(path.sep).join('/')]:[];}).sort();}
const all=scan(data),files=all.filter(f=>p.isWasteFile(f)||p.isJfmFile(f));
for(const f of all.filter(f=>!files.includes(f)))console.warn('非半成品或 JFM 報表，略過：'+f);
const manifestPath=path.join(data,'json-manifest.json');
let old={files:{}};if(fs.existsSync(manifestPath))old=read(manifestPath);
const entries={};let converted=0;
for(const f of files){
 const bytes=fs.readFileSync(path.join(data,f)),sha=hash(bytes),json='data-json/'+f.replace(/\.xlsx$/i,'.json'),dest=path.join(root,json);
 if(process.argv.includes('--check')){
  const entry=old.files[f];if(!entry||entry.sourceSha256!==sha||old.parserHash!==parserHash)throw Error('索引或來源不一致：'+f);
  const payload=read(dest);if(payload.source!==f||payload.sourceSha256!==sha||keys.some(k=>!Array.isArray(payload[k]))||fs.statSync(dest).size!==entry.jsonBytes)throw Error('JSON 資料不完整：'+f);
  continue;
 }
 if(old.parserHash===parserHash&&old.files[f]?.sourceSha256===sha&&fs.existsSync(dest)){entries[f]=old.files[f];continue;}
 const wb=XLSX.read(bytes,{type:'buffer',cellDates:true}),waste=p.isWasteFile(f);
 const payload={schemaVersion:1,source:f,sourceSha256:sha,summary:waste?p.parseSummaryFromWB(wb,f):[],details:waste?p.parseDetailsFromWB(wb,f):[],halfDetails:waste?p.parseHalfDetailsFromWB(wb,f):[],reasonWeeks:waste?[]:p.parseReasonFromWB(wb,f),top20Entries:waste?[]:p.parseTop20FromWB(wb,f)};
 save(dest,payload);entries[f]={json,sourceSha256:sha,jsonBytes:fs.statSync(dest).size};converted++;console.log('Converted '+f);
}
if(process.argv.includes('--check')){
 const manifest=read(path.join(data,'manifest.json'));if(JSON.stringify(manifest.files)!==JSON.stringify(files))throw Error('Excel 清單未同步');
 console.log(`Checked ${files.length} files successfully`);
}else{
 save(path.join(data,'manifest.json'),{version:1,basePath:'',files});
 save(manifestPath,{schemaVersion:1,parserHash,files:entries});
 console.log(`${files.length} files; ${converted} converted; ${files.length-converted} unchanged`);
}
