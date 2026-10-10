(function(){
'use strict';
const PALETA=['#60A5FA','#A78BFA','#34D399','#F472B6','#FB923C','#22D3EE'];
const NEUTRO='#9AA1B2';
const AUTOR='Tú <tu@ejemplo.com>';
const DX=100,DY=120,RY=-270,RDY=70;
const C=(k,t)=>'\x01'+k+'\x02'+t+'\x03';
const M=t=>C('m',t);
const cl=o=>JSON.parse(JSON.stringify(o));
const keys=(...os)=>[...new Set(os.flatMap(o=>Object.keys(o||{})))].sort();
const short=h=>h?h.slice(0,7):'';
const pl=(n,a,b)=>n+' '+(n===1?a:b);
function hashStr(str){let out='';for(let s=0;s<5;s++){let x=(0x811c9dc5^Math.imul(s+1,0x9e3779b1))>>>0;for(let i=0;i<str.length;i++){x^=str.charCodeAt(i);x=Math.imul(x,16777619);}x^=x>>>13;x=Math.imul(x,0x5bd1e995);x^=x>>>15;out+=(x>>>0).toString(16).padStart(8,'0');}return out;}
function GitError(lines){this.lines=lines;}
function fail(main,...rest){throw new GitError([main.includes('\x01')?main:C('e',main),...rest.map(x=>x.includes('\x01')||x===''?x:M(x))]);}

function vacio(){return {v:1,inited:false,files:{},index:{},commits:{},order:[],branches:{},colorOf:{},nColors:0,laneOf:{},lanes:[],detLane:null,tags:{},head:{type:'branch',name:'main'},prev:null,stash:[],reflog:[],remote:{branches:{},known:{}},tracking:{},upstream:{},op:null,seq:0,tm:0};}
function ensureColor(s,n){if(!(n in s.colorOf))s.colorOf[n]=s.nColors++;}
function colorRama(s,n){return n in s.colorOf?PALETA[s.colorOf[n]%PALETA.length]:NEUTRO;}
function laneFor(s,n){
  if(n==null){if(s.detLane==null){s.detLane=s.lanes.length;s.lanes.push({name:'',color:NEUTRO});}return s.detLane;}
  if(!(n in s.laneOf)){ensureColor(s,n);s.laneOf[n]=s.lanes.length;s.lanes.push({name:n,color:colorRama(s,n)});}
  return s.laneOf[n];}
const headHash=s=>s.head.type==='branch'?(s.branches[s.head.name]||null):s.head.hash;
const treeOf=(s,h)=>h&&s.commits[h]?s.commits[h].tree:{};
function anc(s,...hs){const seen={},st=hs.filter(Boolean);while(st.length){const x=st.pop();if(seen[x])continue;seen[x]=1;const c=s.commits[x];if(c)st.push(...c.parents);}return seen;}
const isAnc=(s,a,b)=>!!anc(s,b)[a];
function mergeBase(s,a,b){const A=anc(s,a);let best=null;for(const x in anc(s,b))if(A[x]&&(!best||s.commits[x].n>s.commits[best].n))best=x;return best;}
const same=(a,b)=>keys(a,b).every(k=>a[k]===b[k]);
function setK(o,k,v){if(v===undefined||v===null)delete o[k];else o[k]=v;}
function aheadBehind(s,a,b){const A=anc(s,a),B=anc(s,b);let ah=0,bh=0;for(const x in A)if(!B[x])ah++;for(const x in B)if(!A[x])bh++;return [ah,bh];}
function curName(s){return s.head.type==='branch'?s.head.name:null;}
function reflogPush(s,msg){s.reflog.unshift({h:headHash(s),msg});if(s.reflog.length>200)s.reflog.pop();}
function setHead(s,h,msg){if(s.head.type==='branch')s.branches[s.head.name]=h;else s.head.hash=h;reflogPush(s,msg);}
function nuevoCommit(s,{msg,parents,tree,lane,author=AUTOR,t,extra={}}){
  s.seq++;const hash=hashStr([msg,parents.join(','),JSON.stringify(tree),author,s.seq].join('|'));
  let x=parents.length?Math.max(...parents.map(p=>s.commits[p].x))+1:0;
  const occ=new Set(Object.values(s.commits).filter(c=>c.lane===lane&&!c.dy).map(c=>c.x));
  while(occ.has(x))x++;
  const c=Object.assign({hash,n:s.order.length+1,msg,parents,tree:cl(tree),author,t:t||Date.now(),lane,x,local:true},extra);
  s.commits[hash]=c;s.order.push(hash);return c;}
function laneActual(s){return s.head.type==='branch'?laneFor(s,s.head.name):laneFor(s,null);}

function resolve(s,ref){
  if(!ref)return null;
  const m=/^(.+?)((?:[~^]\d*)*)$/.exec(ref);if(!m)return null;
  const base=m[1],suf=m[2];let h=null;
  if(base==='HEAD'||base==='@')h=headHash(s);
  else if(base in s.branches)h=s.branches[base];
  else if(base in s.tags)h=s.tags[base];
  else if(/^(remotes\/)?origin\/./.test(base)){h=s.tracking[base.replace(/^(remotes\/)?origin\//,'')]||null;}
  else if(/^[0-9a-f]{4,40}$/i.test(base)){const ms=s.order.filter(x=>s.commits[x].local&&x.startsWith(base.toLowerCase()));if(ms.length===1)h=ms[0];else if(ms.length>1)fail(`error: el id corto ${base} es ambiguo`,'Escribe algunos caracteres más del hash.');}
  if(!h)return null;
  const re=/([~^])(\d*)/g;let mm;
  while((mm=re.exec(suf))){const n=mm[2]===''?1:+mm[2];
    if(mm[1]==='~'){for(let i=0;i<n;i++){h=s.commits[h].parents[0];if(!h)return null;}}
    else if(n>0){h=s.commits[h].parents[n-1];if(!h)return null;}}
  return h;}
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i?Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j;}return d[a.length][b.length];}
function cercano(x,list){let best=null,bd=3;for(const c of list){const d=lev(x,c);if(d<bd){bd=d;best=c;}}return best;}
function resolveOr(s,ref){const h=resolve(s,ref);if(h)return h;
  const near=cercano(ref,[...Object.keys(s.branches),...Object.keys(s.tags)]);
  if(/[~^]/.test(ref)&&resolve(s,ref.replace(/[~^].*$/,'')))fail(`fatal: '${ref}' no existe`,'La historia no es tan larga: no hay tantos commits hacia atrás.');
  fail(`fatal: argumento ambiguo '${ref}': revisión desconocida`,near?`¿Quisiste decir ${near}?`:'Usa un nombre de rama, un hash (mira git log --oneline) o HEAD~1.');}

function estadoArchivos(s){const H=treeOf(s,headHash(s)),I=s.index,W=s.files,conf=(s.op&&s.op.conflicts)||[];const st=[],un=[],ut=[];
  for(const f of keys(H,I)){if(conf.includes(f))continue;if(H[f]!==I[f])st.push({f,t:H[f]===undefined?'nuevo':I[f]===undefined?'borrado':'modificado'});}
  for(const f of keys(I,W)){if(conf.includes(f))continue;if(!(f in I)){if(!(f in H)||true)ut.push({f});continue;}if(W[f]!==I[f])un.push({f,t:W[f]===undefined?'borrado':'modificado'});}
  return {H,st,un,ut:ut.filter(x=>!(x.f in I)),conf};}
const sucio=s=>{const e=estadoArchivos(s);return e.st.length+e.un.length+e.conf.length>0;};
function untracked(s){const o={};for(const f in s.files)if(!(f in s.index))o[f]=s.files[f];return o;}

function cambiarArbol(s,target){
  const H=treeOf(s,headHash(s)),T=treeOf(s,target),I=s.index,W=s.files,bad=[];
  const nI={},nW={};
  for(const f of keys(H,I,W,T)){
    const dI=I[f]!==H[f],ut=(f in W)&&!(f in I)&&!(f in H),dW=!ut&&W[f]!==I[f];
    if(ut){if(f in T&&T[f]!==W[f])bad.push(f);}
    else if((dI||dW)&&H[f]!==T[f])bad.push(f);
    setK(nI,f,dI?I[f]:T[f]);setK(nW,f,(dI||dW||ut)?W[f]:T[f]);}
  if(bad.length)fail('error: tus cambios locales en los siguientes archivos serían sobrescritos:',...bad.map(f=>C('r','\t'+f)),'Haz commit de tus cambios o guárdalos con git stash antes de cambiar.');
  s.index=nI;s.files=nW;}

function tokens(str){const out=[];let cur='',q=null,has=false;const push=()=>{if(cur||has){out.push(cur);cur='';has=false;}};
  for(const ch of str){if(q){if(ch===q)q=null;else cur+=ch;}else if(ch==='"'||ch==="'"){q=ch;has=true;}else if(/\s/.test(ch))push();else if(ch==='>'){push();if(out[out.length-1]==='>')out[out.length-1]='>>';else out.push('>');}else cur+=ch;}
  if(q)return null;push();return out;}

function diffTxt(a,b){const A=a==null||a===''?[]:a.split('\n'),B=b==null||b===''?[]:b.split('\n');const n=A.length,m=B.length;
  const d=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=A[i]===B[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
  const out=[];let i=0,j=0;
  while(i<n||j<m){if(i<n&&j<m&&A[i]===B[j]){out.push(' '+A[i]);i++;j++;}else if(i<n&&(j>=m||d[i+1][j]>=d[i][j+1])){out.push('-'+A[i]);i++;}else{out.push('+'+B[j]);j++;}}
  return out;}
function diffArboles(A,B,only){const L=[];for(const f of keys(A,B)){if(only&&only.length&&!only.includes(f))continue;if(A[f]===B[f])continue;
  L.push(C('bold','diff --git a/'+f+' b/'+f));if(A[f]===undefined)L.push(C('bold','nuevo archivo'));if(B[f]===undefined)L.push(C('bold','archivo borrado'));
  L.push(C('bold','--- '+(A[f]===undefined?'/dev/null':'a/'+f)),C('bold','+++ '+(B[f]===undefined?'/dev/null':'b/'+f)),C('cy','@@'));
  for(const l of diffTxt(A[f],B[f]))L.push(l[0]==='+'?C('g',l):l[0]==='-'?C('r',l):l);}return L;}
function cambiosCommit(s,h){const c=s.commits[h];const P=treeOf(s,c.parents[0]);return keys(P,c.tree).filter(f=>P[f]!==c.tree[f]).map(f=>({f,t:P[f]===undefined?'+':c.tree[f]===undefined?'−':'~'}));}

function hunks(b,x){const ops=diffTxt(b,x);const H=[];let i=0,cur=null;
  for(const op of ops){if(op[0]===' '){if(cur){H.push(cur);cur=null;}i++;}else{if(!cur)cur={s:i,e:i,lines:[]};if(op[0]==='-'){i++;cur.e=i;}else cur.lines.push(op.slice(1));}}
  if(cur)H.push(cur);return H;}
function fusionLineas(b,o,t){const A=hunks(b,o),Bh=hunks(b,t);
  for(const x of A)for(const y of Bh){if(x.s<y.e&&y.s<x.e||x.s===y.s||x.e===y.s&&x.s!==x.e&&y.s!==y.e||y.e===x.s&&x.s!==x.e&&y.s!==y.e){if(x.s===y.s&&x.e===y.e&&x.lines.join('\n')===y.lines.join('\n'))continue;return null;}}
  const base=b===''?[]:b.split('\n');const all=A.concat(Bh.filter(y=>!A.some(x=>x.s===y.s&&x.e===y.e&&x.lines.join('\n')===y.lines.join('\n')))).sort((p,q)=>q.s-p.s||q.e-p.e);
  for(const h of all)base.splice(h.s,h.e-h.s,...h.lines);return base.join('\n');}
function fusionar3(B,O,T){const tree={},conf=[],data={};
  for(const f of keys(B,O,T)){const b=B[f],o=O[f],t=T[f];let v;
    if(o===t)v=o;else if(o===b)v=t;else if(t===b)v=o;else if(b!=null&&o!=null&&t!=null&&(v=fusionLineas(b,o,t))!=null){}else{conf.push(f);data[f]={ours:o,theirs:t};continue;}
    if(v!==undefined)tree[f]=v;}
  return {tree,conf,data};}
function marcadores(o,t,name){return '<<<<<<< HEAD\n'+(o==null?'':o)+'\n=======\n'+(t==null?'':t)+'\n>>>>>>> '+name;}
function aplicarResultado(s,m,name){const ut=untracked(s);s.index=cl(m.tree);const W=Object.assign(cl(m.tree),ut);
  for(const f of m.conf){setK(s.index,f,m.data[f].ours);W[f]=marcadores(m.data[f].ours,m.data[f].theirs,name);}s.files=W;}

function decor(s,h){const p=[];const cur=curName(s);
  if(s.head.type==='detached'&&s.head.hash===h)p.push(C('h','HEAD'));
  if(cur&&s.branches[cur]===h)p.push(C('h','HEAD -> ')+C('c:'+colorRama(s,cur),cur));
  for(const b in s.branches)if(b!==cur&&s.branches[b]===h)p.push(C('c:'+colorRama(s,b),b));
  for(const b in s.tracking)if(s.tracking[b]===h)p.push(C('r','origin/'+b));
  for(const t in s.tags)if(s.tags[t]===h)p.push(C('y','tag: '+t));
  return p.length?C('y',' (')+p.join(C('y',', '))+C('y',')'):'';}
function fecha(t){const d=new Date(t);return d.toLocaleString('es-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function cabecera(s,c){const L=[C('y','commit '+c.hash)+decor(s,c.hash)];if(c.parents.length>1)L.push('Merge: '+c.parents.map(short).join(' '));L.push('Autor: '+c.author,'Fecha: '+fecha(c.t),'','    '+c.msg,'');return L;}

function trackLine(s,b){const up=s.upstream[b];if(!up||!s.tracking[up]||!s.branches[b])return null;const [a,bh]=aheadBehind(s,s.branches[b],s.tracking[up]);const o=`'origin/${up}'`;
  if(!a&&!bh)return `Tu rama está actualizada con ${o}.`;if(a&&!bh)return `Tu rama está adelantada a ${o} por ${pl(a,'commit','commits')}.`+'\n'+M('  (usa "git push" para publicar tus commits locales)');
  if(!a)return `Tu rama está detrás de ${o} por ${pl(bh,'commit','commits')}, y puede avanzar rápido.`+'\n'+M('  (usa "git pull" para actualizar tu rama local)');
  return `Tu rama y ${o} han divergido: ${a} y ${bh} commits distintos.`+'\n'+M('  (usa "git pull" para unirlas)');}

const SUB={nuevo:'nuevo archivo:   ',modificado:'modificados:     ',borrado:'borrados:        '};
const OPNOM={merge:'MERGING',rebase:'REBASE','cherry-pick':'CHERRY-PICKING',revert:'REVERTING'};

function crearRama(s,n,h,r){
  if(!/^[A-Za-z0-9._\/-]+$/.test(n)||n.startsWith('-')||n.includes('..')||n==='HEAD'||n.endsWith('/'))fail(`fatal: '${n}' no es un nombre válido para una rama`,'Usa letras, números, guiones o barras, sin espacios. Ejemplo: feature/login');
  if(n in s.branches)fail(`fatal: una rama llamada '${n}' ya existe`,`Para ir a ella: git switch ${n}`);
  ensureColor(s,n);s.branches[n]=h;r.ev('branch-created',{name:n,hash:h});}
function irARama(s,n,r){
  if(s.op)fail(`error: no puedes cambiar de rama en mitad de un ${s.op.kind}`,`Termínalo (git add + git commit${s.op.kind==='rebase'?' / git rebase --continue':''}) o cancélalo con git ${s.op.kind} --abort.`);
  if(curName(s)===n){r.out(`Ya en '${n}'`);return;}
  cambiarArbol(s,s.branches[n]);const from=curName(s)||short(headHash(s));s.prev=from;s.head={type:'branch',name:n};reflogPush(s,`checkout: moving from ${from} to ${n}`);
  r.out(`Cambiado a rama '${C('c:'+colorRama(s,n),n)}'`);const tl=trackLine(s,n);if(tl)r.out(...tl.split('\n'));r.ev('switched',{name:n});}
function separar(s,h,label,r){
  if(s.op)fail(`error: no puedes moverte en mitad de un ${s.op.kind}`,`Cancélalo con git ${s.op.kind} --abort.`);
  if(s.head.type==='detached'&&s.head.hash===h){r.out(`HEAD ya está en ${short(h)}`);return;}
  cambiarArbol(s,h);s.prev=curName(s)||short(headHash(s));s.head={type:'detached',hash:h};reflogPush(s,`checkout: moving to ${label}`);
  r.out(`Nota: cambiando a '${label}'.`,'',C('w',"Estás en estado 'HEAD separado'.")+' Puedes mirar, experimentar y hacer commits;',"si quieres conservarlos, crea una rama con git switch -c <nombre>.",'',`HEAD está ahora en ${C('y',short(h))} ${s.commits[h].msg}`);r.ev('detached',{hash:h});}

function expand(s,ps,pool){const out=[];for(const p of ps){if(p.includes('*')){const re=new RegExp('^'+p.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$');const m=pool.filter(f=>re.test(f));if(!m.length)fail(`fatal: la ruta '${p}' no coincide con ningún archivo`);out.push(...m);}else out.push(p);}return [...new Set(out)];}

function aplicarCommit(s,src,{base,theirs,name}){const cur=treeOf(s,headHash(s));return fusionar3(base,cur,theirs);}

function procesarRebase(s,r){const op=s.op;
  while(op.todo.length){const h=op.todo.shift();const c=s.commits[h];const cur=treeOf(s,headHash(s));
    const m=fusionar3(treeOf(s,c.parents[0]),cur,c.tree);
    if(m.conf.length){op.current=h;op.other=h;op.otherName=short(h)+' ('+c.msg+')';op.conflicts=m.conf;op.data=m.data;aplicarResultado(s,m,short(h));
      r.out(...m.conf.map(f=>C('e','CONFLICTO (contenido): conflicto de fusión en '+f)),C('e',`error: no se pudo aplicar ${short(h)}... ${c.msg}`),M('Resuelve el conflicto, usa git add <archivo> y luego git rebase --continue.'),M('Para cancelar todo: git rebase --abort.'));
      r.ev('merge-conflict',{files:m.conf,kind:'rebase'});return;}
    if(same(m.tree,cur)){r.out(M(`Saltado ${short(h)}: sus cambios ya estaban.`));continue;}
    const n=nuevoCommit(s,{msg:c.msg,parents:[headHash(s)],tree:m.tree,lane:op.lane,author:c.author,extra:{copyOf:h}});
    setHead(s,n.hash,'rebase (pick): '+c.msg);op.pairs.push([h,n.hash]);s.index=cl(n.tree);s.files=Object.assign(cl(n.tree),untracked(s));}
  r.out(`Rebase aplicado satisfactoriamente y actualizado ${op.branch?'refs/heads/'+op.branch:'HEAD'}.`);
  r.ev('commits-copied',{pairs:op.pairs});r.ev('rebase-done',{count:op.pairs.length,branch:op.branch,onto:op.ontoName});s.op=null;}

const GIT={
init(s,a,r){if(s.inited){r.out('Reinicializado el repositorio Git existente en /home/tu/proyecto/.git/');return;}
  s.inited=true;s.head={type:'branch',name:'main'};ensureColor(s,'main');r.out('Inicializado repositorio Git vacío en /home/tu/proyecto/.git/');r.ev('repo-init');},
status(s,a,r){const {st,un,ut,conf}=estadoArchivos(s);const cur=curName(s);
  if(cur)r.out('En la rama '+C('c:'+colorRama(s,cur),cur));else r.out(C('w','HEAD separado en '+short(s.head.hash)));
  if(s.op){const k=s.op.kind;if(k==='rebase')r.out(C('w',`Rebase en progreso sobre ${s.op.ontoName}.`));else if(k!=='merge')r.out(C('w',`${k} en progreso de ${short(s.op.other)}.`));}
  if(cur){const tl=trackLine(s,cur);if(tl)r.out(...tl.split('\n'));}
  if(!headHash(s))r.out('','No hay commits todavía');
  if(s.op&&s.op.kind==='merge'){r.out('',conf.length?'Tienes rutas no fusionadas.':'Todos los conflictos están resueltos, pero sigues fusionando.',M(conf.length?'  (arregla los conflictos y ejecuta "git commit")':'  (usa "git commit" para concluir la fusión)'),M('  (usa "git merge --abort" para cancelar la fusión)'));}
  if(st.length)r.out('','Cambios a ser confirmados:',M('  (usa "git restore --staged <archivo>..." para sacar del área de stage)'),...st.map(x=>C('g','\t'+SUB[x.t]+x.f)));
  if(conf.length)r.out('','Rutas no fusionadas:',M('  (usa "git add <archivo>..." para marcar una resolución)'),...conf.map(f=>C('r','\tambos modificados:   '+f)));
  if(un.length)r.out('','Cambios no rastreados para el commit:',M('  (usa "git add <archivo>..." para actualizar lo que será confirmado)'),M('  (usa "git restore <archivo>..." para descartar los cambios)'),...un.map(x=>C('r','\t'+SUB[x.t]+x.f)));
  if(ut.length)r.out('','Archivos sin seguimiento:',M('  (usa "git add <archivo>..." para incluirlo en el próximo commit)'),...ut.map(x=>C('r','\t'+x.f)));
  if(!st.length&&!un.length&&!ut.length&&!conf.length)r.out('',headHash(s)?'nada para hacer commit, el árbol de trabajo está limpio':'nada para hacer commit (crea archivos y usa "git add" para rastrearlos)');
  else if(!st.length&&!conf.length)r.out('',M('no hay cambios agregados al commit (usa "git add")'));},
add(s,a,r){const all=a.some(x=>['.','-A','--all'].includes(x));const ps=a.filter(x=>!x.startsWith('-')&&x!=='.');
  if(!all&&!ps.length)fail('Nada especificado, nada agregado.','Prueba git add <archivo> o git add . para añadirlo todo.');
  const pool=keys(s.index,s.files);const list=all?pool:expand(s,ps,pool);const conf=s.op?s.op.conflicts:[];
  for(const f of list){if(!(f in s.files)&&!(f in s.index))fail(`fatal: la ruta '${f}' no coincide con ningún archivo`,`Mira los archivos que tienes con ls.`);}
  for(const f of list){setK(s.index,f,s.files[f]);const i=conf.indexOf(f);if(i>=0){conf.splice(i,1);if((s.files[f]||'').includes('<<<<<<<'))r.out(C('w',`aviso: ${f} todavía contiene marcadores de conflicto (<<<<<<<).`));r.ev('conflict-resolved',{file:f});}}
  if(s.op&&s.op.conflicts&&!s.op.conflicts.length&&conf===s.op.conflicts&&list.some(f=>true))r.out(M(s.op.kind==='rebase'?'Conflictos resueltos. Ahora: git rebase --continue':s.op.kind==='merge'?'Conflictos resueltos. Ahora: git commit para terminar el merge':`Conflictos resueltos. Ahora: git ${s.op.kind} --continue`));},
restore(s,a,r){const staged=a.includes('--staged')||a.includes('-S');const ps=a.filter(x=>!x.startsWith('-'));
  if(!ps.length)fail('fatal: debes indicar qué archivo(s) restaurar','Ejemplo: git restore README.md');
  const H=treeOf(s,headHash(s));
  if(staged){const list=ps.includes('.')?keys(H,s.index):expand(s,ps,keys(H,s.index));for(const f of list){if(!(f in H)&&!(f in s.index))fail(`error: la ruta '${f}' no coincide con ningún archivo conocido por git`);setK(s.index,f,H[f]);}}
  else{const list=ps.includes('.')?keys(s.index):expand(s,ps,keys(s.index,s.files));for(const f of list){if(!(f in s.index))fail(`error: la ruta '${f}' no coincide con ningún archivo conocido por git`,'Es un archivo sin seguimiento: Git no tiene una versión guardada a la que volver. Para borrarlo usa rm '+f+'.');s.files[f]=s.index[f];}r.ev('file-restored',{files:list});}},
rm(s,a,r){const cached=a.includes('--cached');const ps=a.filter(x=>!x.startsWith('-'));if(!ps.length)fail('uso: git rm <archivo>');
  const list=expand(s,ps,keys(s.index));for(const f of list){if(!(f in s.index))fail(`fatal: la ruta '${f}' no coincide con ningún archivo rastreado`,'git rm solo funciona con archivos que Git ya conoce. Para archivos nuevos usa rm.');}
  for(const f of list){delete s.index[f];if(!cached)delete s.files[f];r.out(`rm '${f}'`);}},
mv(s,a,r){const ps=a.filter(x=>!x.startsWith('-'));if(ps.length!==2)fail('uso: git mv <origen> <destino>');const [x,y]=ps;if(!(x in s.index))fail(`fatal: no está bajo control de versiones, origen=${x}`);
  s.files[y]=s.files[x];delete s.files[x];s.index[y]=s.index[x];delete s.index[x];},
commit(s,a,r){let msg=null,all=false,amend=false;
  for(let i=0;i<a.length;i++){const x=a[i];
    if(x==='-m'||x==='--message'){msg=a[++i];if(msg==null)fail('error: la opción -m necesita un mensaje','Ejemplo: git commit -m "Añade login"');}
    else if(/^-[am]{2}$/.test(x)){all=true;msg=a[++i];if(msg==null)fail('error: la opción -m necesita un mensaje');}
    else if(x==='-a'||x==='--all')all=true;else if(x==='--amend')amend=true;else if(x==='--no-edit'){}
    else if(x.startsWith('-m'))msg=x.slice(2);else fail(`error: opción desconocida '${x}'`,'Opciones: -m "mensaje", -a, -am "mensaje", --amend');}
  if(s.op&&s.op.kind==='rebase')fail('Estás en mitad de un rebase.','Usa git add <archivo> y luego git rebase --continue (o git rebase --abort).');
  if(s.op&&s.op.conflicts.length)fail('error: no es posible hacer commit porque tienes archivos sin fusionar.','Resuelve el conflicto, marca el archivo con git add y vuelve a intentarlo.');
  if(all)for(const f of keys(s.index))setK(s.index,f,s.files[f]);
  const parent=headHash(s),H=treeOf(s,parent);
  if(amend){if(!parent)fail('fatal: no hay nada que corregir: aún no hay commits');const old=s.commits[parent];const m=msg??old.msg;
    const disp=Object.values(s.commits).filter(c=>c.lane===old.lane&&c.x===old.x&&c.dy).length;old.dy=-46*(disp+1);
    const c=nuevoCommit(s,{msg:m,parents:old.parents,tree:s.index,lane:old.lane});setHead(s,c.hash,'commit (amend): '+m);
    r.out(`[${curName(s)||'HEAD separado'} ${C('y',short(c.hash))}] ${m}`);r.ev('commit-amended',{hash:c.hash,old:old.hash});return;}
  let parents=parent?[parent]:[],extra={},kind=s.op&&s.op.kind;
  if(kind==='merge'){parents.push(s.op.other);msg=msg??s.op.msg;}
  else if(kind==='cherry-pick'){extra.cherryOf=s.op.other;msg=msg??s.op.msg;}
  else if(kind==='revert'){extra.revertOf=s.op.other;msg=msg??s.op.msg;}
  if(msg==null)fail('Git abriría un editor para escribir el mensaje, pero aquí no hay editor.','Usa git commit -m "tu mensaje".');
  if(!msg.trim())fail('Abortando commit: el mensaje está vacío.');
  if(!kind&&same(H,s.index)){const e=estadoArchivos(s);fail(e.un.length||e.ut.length?'no hay cambios agregados al commit':'nada para hacer commit, el árbol de trabajo está limpio',e.un.length||e.ut.length?'Primero prepara los cambios con git add <archivo> (o usa git commit -am "msg" para los ya rastreados).':'Crea o modifica un archivo primero, por ejemplo: echo "hola" > notas.txt');}
  const changed=keys(H,s.index).filter(f=>H[f]!==s.index[f]);
  const c=nuevoCommit(s,{msg,parents,tree:s.index,lane:laneActual(s),extra});setHead(s,c.hash,(parents.length?'commit: ':'commit (initial): ')+msg);
  const op=s.op;s.op=null;
  r.out(`[${curName(s)||'HEAD separado'}${parents.length?'':' (commit-raíz)'} ${C('y',short(c.hash))}] ${msg}`,` ${pl(changed.length,'archivo cambiado','archivos cambiados')}`);
  if(kind==='merge')r.ev('merge-commit',{hash:c.hash,theirs:op.otherName,into:curName(s)});
  else if(kind==='cherry-pick')r.ev('cherry-picked',{hash:c.hash,of:op.other});
  else if(kind==='revert')r.ev('reverted',{hash:c.hash,of:op.other});
  else r.ev('commit-created',{hash:c.hash,files:changed,branch:curName(s),root:!parents.length});},
log(s,a,r){const o=new Set(a.filter(x=>x.startsWith('-')));const one=o.has('--oneline'),gr=o.has('--graph'),all=o.has('--all');const ref=a.find(x=>!x.startsWith('-'));
  let starts;if(all)starts=[headHash(s),...Object.values(s.branches),...Object.values(s.tags),...Object.values(s.tracking)];else{const h=ref?resolveOr(s,ref):headHash(s);if(!h)fail(`fatal: tu rama actual '${curName(s)}' todavía no tiene commits`,'Haz tu primer commit: git add . y git commit -m "Primer commit"');starts=[h];}
  const A=anc(s,...starts);const list=s.order.filter(h=>A[h]).reverse();if(!list.length){r.out(M('(sin commits)'));return;}
  for(const h of list){const c=s.commits[h];const g=gr?(c.parents.length>1?'*   ':'* '):'';
    if(one)r.out(g+C('y',short(h))+decor(s,h)+' '+c.msg);
    else{const L=cabecera(s,c);r.out(...L.map((l,i)=>(gr?(i===0?'* ':'| '):'')+l));}}},
show(s,a,r){const ref=a.find(x=>!x.startsWith('-'))||'HEAD';const h=resolveOr(s,ref);const c=s.commits[h];r.out(...cabecera(s,c));if(c.parents.length<2)r.out(...diffArboles(treeOf(s,c.parents[0]),c.tree));else r.out(M('(commit de merge: une dos historias)'));},
diff(s,a,r){const staged=a.includes('--staged')||a.includes('--cached');const ps=a.filter(x=>!x.startsWith('-'));let ref=null,only=ps;
  if(ps[0]&&!(ps[0] in s.files)&&!(ps[0] in s.index)){ref=resolveOr(s,ps[0]);only=ps.slice(1);}
  const tracked={};for(const f in s.index)if(f in s.files)tracked[f]=s.files[f];
  const L=ref?diffArboles(treeOf(s,ref),staged?s.index:tracked,only):staged?diffArboles(treeOf(s,headHash(s)),s.index,only):diffArboles(s.index,tracked,only);
  if(L.length)r.out(...L);else r.out(M(staged?'Sin diferencias entre el staging y el último commit.':'Sin diferencias entre tus archivos y el staging. (Prueba git diff --staged)'));},
branch(s,a,r){const o=a.filter(x=>x.startsWith('-')),ps=a.filter(x=>!x.startsWith('-'));const cur=curName(s);
  if(o.some(x=>['-d','-D','--delete'].includes(x))){if(!ps.length)fail('fatal: falta el nombre de la rama','Ejemplo: git branch -d feature');const force=o.includes('-D');
    for(const n of ps){if(!(n in s.branches))fail(`error: rama '${n}' no encontrada.`);if(n===cur)fail(`error: no puedes borrar la rama '${n}' porque estás en ella`,'Cambia antes a otra rama, por ejemplo: git switch main');
      const h=s.branches[n];if(!force&&!isAnc(s,h,headHash(s))&&!(s.upstream[n]&&s.tracking[s.upstream[n]]&&isAnc(s,h,s.tracking[s.upstream[n]])))fail(`error: la rama '${n}' no ha sido fusionada completamente.`,`Si la borras, sus commits quedarán sin referencia. Si estás seguro: git branch -D ${n}`);
      delete s.branches[n];delete s.upstream[n];r.out(`Eliminada la rama ${n} (era ${C('y',short(h))}).`);r.ev('branch-deleted',{name:n});}return;}
  if(o.some(x=>['-m','-M','--move'].includes(x))){let [x,y]=ps;if(ps.length===1){y=x;x=cur;}if(!x||!y)fail('uso: git branch -m <viejo> <nuevo>');if(!(x in s.branches))fail(`error: rama '${x}' no encontrada.`);if(y in s.branches)fail(`fatal: una rama llamada '${y}' ya existe`);
    s.branches[y]=s.branches[x];delete s.branches[x];if(x in s.colorOf){s.colorOf[y]=s.colorOf[x];delete s.colorOf[x];}if(x in s.laneOf){s.laneOf[y]=s.laneOf[x];delete s.laneOf[x];s.lanes[s.laneOf[y]].name=y;}if(x in s.upstream){s.upstream[y]=s.upstream[x];delete s.upstream[x];}if(cur===x)s.head.name=y;
    r.ev('branch-renamed',{from:x,to:y});return;}
  if(ps.length){const h=ps[1]?resolveOr(s,ps[1]):headHash(s);if(!h)fail(`fatal: no es un nombre de objeto válido: '${cur}'.`,'Una rama apunta a un commit, y todavía no hay ninguno. Haz tu primer commit.');crearRama(s,ps[0],h,r);return;}
  const names=Object.keys(s.branches).sort();if(!names.length&&!o.includes('-a')){r.out(M('(no hay ramas todavía: haz un primer commit)'));return;}
  if(s.head.type==='detached')r.out('* '+C('w',`(HEAD separado en ${short(s.head.hash)})`));
  if(!o.includes('-r'))for(const n of names)r.out(n===cur?'* '+C('g',n):'  '+n);
  if(o.includes('-a')||o.includes('-r'))for(const b of Object.keys(s.tracking).sort())r.out('  '+C('r','remotes/origin/'+b));},
switch(s,a,r){const create=a.some(x=>['-c','-C','--create'].includes(x)),det=a.some(x=>['-d','--detach'].includes(x));const ps=a.filter(x=>!x.startsWith('-')||x==='-');
  if(!ps.length)fail('fatal: falta la rama a la que cambiar','Ejemplo: git switch main  ·  o crea una: git switch -c nueva');
  if(create){const n=ps[0];const h=ps[1]?resolveOr(s,ps[1]):headHash(s);if(!h){if(n in s.branches)fail(`fatal: una rama llamada '${n}' ya existe`);s.head={type:'branch',name:n};ensureColor(s,n);r.out(`Cambiado a nueva rama '${n}'`);r.ev('branch-created',{name:n});return;}
    if(s.op)fail(`error: no puedes cambiar de rama en mitad de un ${s.op.kind}`);
    crearRama(s,n,h,r);cambiarArbol(s,h);s.prev=curName(s)||short(headHash(s));s.head={type:'branch',name:n};reflogPush(s,`checkout: moving to ${n}`);r.out(`Cambiado a nueva rama '${C('c:'+colorRama(s,n),n)}'`);r.ev('switched',{name:n,created:true});return;}
  let t=ps[0];if(t==='-'){if(!s.prev)fail('fatal: no hay rama anterior');t=s.prev;}
  if(t in s.branches&&!det)return irARama(s,t,r);
  if(!det&&s.tracking[t]){crearRama(s,t,s.tracking[t],r);s.upstream[t]=t;irARama(s,t,r);r.out(`rama '${t}' configurada para rastrear 'origin/${t}'.`);return;}
  const h=resolve(s,t);
  if(h&&det)return separar(s,h,t,r);
  if(h)fail(`fatal: se esperaba una rama, se obtuvo '${t}'`,`git switch solo cambia entre ramas. Para visitar un commit usa git switch --detach ${t} o git checkout ${t}.`);
  const near=cercano(t,Object.keys(s.branches));fail(`fatal: referencia inválida: ${t}`,near?`¿Quisiste decir git switch ${near}?`:`Esa rama no existe. Créala con git switch -c ${t}`);},
checkout(s,a,r){const dd=a.indexOf('--');
  if(dd>=0){const ps=a.slice(dd+1),src=dd>0?resolveOr(s,a[0]):null;if(!ps.length)fail('uso: git checkout -- <archivo>');const T=src?treeOf(s,src):s.index;
    for(const f of ps){if(!(f in T))fail(`error: la ruta '${f}' no coincide con ningún archivo conocido por git`);s.files[f]=T[f];if(src)s.index[f]=T[f];}r.ev('file-restored',{files:ps});return;}
  const bi=a.findIndex(x=>x==='-b'||x==='-B');if(bi>=0){const rest=a.filter((x,i)=>i!==bi);return GIT.switch(s,['-c',...rest],r);}
  const t=a.find(x=>!x.startsWith('-'));if(!t)fail('uso: git checkout <rama | hash | -- archivo>');
  if(t==='-'){if(!s.prev)fail('fatal: no hay rama anterior');return GIT.checkout(s,[s.prev],r);}
  if(t in s.branches)return irARama(s,t,r);
  if(s.tracking[t]&&!t.startsWith('origin/'))return GIT.switch(s,[t],r);
  const h=resolve(s,t);if(h)return separar(s,h,t,r);
  if(t in s.index){s.files[t]=s.index[t];r.out(`Actualizada 1 ruta desde el índice`);r.ev('file-restored',{files:[t]});return;}
  const near=cercano(t,[...Object.keys(s.branches),...Object.keys(s.files)]);fail(`error: la ruta '${t}' no coincide con ninguna rama, commit ni archivo`,near?`¿Quisiste decir ${near}?`:'Mira tus ramas con git branch y tus commits con git log --oneline.');},
tag(s,a,r){const o=a.filter(x=>x.startsWith('-'));const ps=[];for(let i=0;i<a.length;i++){if(a[i]==='-m'){i++;continue;}if(!a[i].startsWith('-'))ps.push(a[i]);}
  if(o.includes('-d')){for(const n of ps){if(!(n in s.tags))fail(`error: tag '${n}' no encontrado.`);r.out(`Eliminado tag '${n}' (era ${short(s.tags[n])})`);delete s.tags[n];r.ev('tag-deleted',{name:n});}return;}
  if(!ps.length){const t=Object.keys(s.tags).sort();r.out(...(t.length?t:[M('(no hay tags todavía. Crea uno: git tag v1.0)')]));return;}
  const n=ps[0];if(!/^[A-Za-z0-9._\/-]+$/.test(n))fail(`fatal: '${n}' no es un nombre de tag válido`);if(n in s.tags)fail(`fatal: el tag '${n}' ya existe`);
  const h=resolveOr(s,ps[1]||'HEAD');s.tags[n]=h;r.ev('tag-created',{name:n,hash:h});},
merge(s,a,r){
  if(a.includes('--abort')){if(!s.op||s.op.kind!=='merge')fail('fatal: no hay ningún merge en curso que cancelar');s.files=s.op.origW;s.index=s.op.origI;s.op=null;r.ev('op-aborted',{kind:'merge'});return;}
  if(a.includes('--continue'))return GIT.commit(s,[],r);
  const noff=a.includes('--no-ff');let msg=null;const mi=a.indexOf('-m');if(mi>=0)msg=a[mi+1];
  const t=a.filter((x,i)=>!x.startsWith('-')&&i!==mi+1||(mi<0&&!x.startsWith('-')))[0];
  if(!t)fail('fatal: falta la rama que quieres unir','Ejemplo: git merge feature');
  if(s.op)fail(`error: ya hay un ${s.op.kind} en curso`,`Termínalo o cancélalo con git ${s.op.kind} --abort.`);
  const theirs=resolveOr(s,t),ours=headHash(s);if(!ours)fail('fatal: tu rama todavía no tiene commits');
  if(sucio(s))fail('error: tienes cambios sin confirmar; el merge podría pisarlos.','Haz commit de tus cambios o guárdalos con git stash antes de unir ramas.');
  const into=curName(s)||'HEAD';
  if(isAnc(s,theirs,ours)){r.out('Ya está actualizado.');r.ev('up-to-date');return;}
  if(isAnc(s,ours,theirs)&&!noff){const T=treeOf(s,theirs),ut=untracked(s);for(const f in ut)if(f in T)fail(`error: el archivo sin seguimiento '${f}' sería sobrescrito por el merge`,'Muévelo, bórralo o haz commit de él primero.');
    setHead(s,theirs,`merge ${t}: Fast-forward`);s.index=cl(T);s.files=Object.assign(cl(T),ut);
    r.out(`Actualizando ${short(ours)}..${short(theirs)}`,'Fast-forward');r.ev('fast-forward',{ref:into,theirs:t,from:ours,to:theirs});return;}
  const base=mergeBase(s,ours,theirs);const m=fusionar3(treeOf(s,base),treeOf(s,ours),treeOf(s,theirs));
  const defMsg=msg||(t.startsWith('origin/')?`Merge remote-tracking branch '${t}'`:`Merge branch '${t}'`)+(into!=='main'&&into!=='HEAD'?` into ${into}`:'');
  if(m.conf.length){s.op={kind:'merge',other:theirs,otherName:t,conflicts:m.conf,data:m.data,msg:defMsg,origW:cl(s.files),origI:cl(s.index)};aplicarResultado(s,m,t);
    r.out(...m.conf.map(f=>'Auto-fusionando '+f),...m.conf.map(f=>C('e','CONFLICTO (contenido): conflicto de fusión en '+f)),C('e','La fusión automática falló; arregla los conflictos y luego haz commit con el resultado.'));r.ev('merge-conflict',{files:m.conf,kind:'merge',theirs:t});return;}
  const c=nuevoCommit(s,{msg:defMsg,parents:[ours,theirs],tree:m.tree,lane:laneActual(s)});setHead(s,c.hash,`merge ${t}: Merge made by the 'ort' strategy.`);
  s.index=cl(m.tree);s.files=Object.assign(cl(m.tree),untracked(s));r.out("Merge hecho por la estrategia 'ort'.");r.ev('merge-commit',{hash:c.hash,theirs:t,into});},
rebase(s,a,r){
  if(a.includes('--abort')){if(!s.op||s.op.kind!=='rebase')fail('fatal: no hay ningún rebase en curso');const op=s.op;if(op.branch){s.head={type:'branch',name:op.branch};s.branches[op.branch]=op.orig;}else s.head={type:'detached',hash:op.orig};
    reflogPush(s,'rebase (abort)');s.index=cl(treeOf(s,op.orig));s.files=Object.assign(cl(treeOf(s,op.orig)),op.ut);s.op=null;r.out('Rebase cancelado: todo vuelve a como estaba.');r.ev('op-aborted',{kind:'rebase'});return;}
  if(a.includes('--continue')){if(!s.op||s.op.kind!=='rebase')fail('fatal: no hay ningún rebase en curso');if(s.op.conflicts.length)fail('error: todavía hay archivos en conflicto: '+s.op.conflicts.join(', '),'Resuélvelos y márcalos con git add <archivo>.');
    const op=s.op,c=s.commits[op.current];op.conflicts=[];if(!same(s.index,treeOf(s,headHash(s)))){const n=nuevoCommit(s,{msg:c.msg,parents:[headHash(s)],tree:s.index,lane:op.lane,author:c.author,extra:{copyOf:op.current}});setHead(s,n.hash,'rebase (continue): '+c.msg);op.pairs.push([op.current,n.hash]);}
    s.files=Object.assign(cl(s.index),untracked(s));return procesarRebase(s,r);}
  if(a.includes('-i')||a.includes('--interactive'))fail('El rebase interactivo (-i) todavía no está en el simulador.','Prueba git rebase <rama>, git reset o git commit --amend para reescribir historia.');
  const t=a.find(x=>!x.startsWith('-'));if(!t)fail('fatal: falta la rama sobre la que hacer rebase','Ejemplo: git rebase main');
  if(s.op)fail(`error: ya hay un ${s.op.kind} en curso`);const up=resolveOr(s,t),ours=headHash(s);if(!ours)fail('fatal: tu rama todavía no tiene commits');
  if(sucio(s))fail('error: no puedes hacer rebase: tienes cambios sin confirmar.','Haz commit o guárdalos con git stash primero.');
  if(isAnc(s,up,ours)){r.out(`La rama actual ${curName(s)||'HEAD'} está al día.`);r.ev('up-to-date');return;}
  if(isAnc(s,ours,up)){setHead(s,up,'rebase: fast-forward');s.index=cl(treeOf(s,up));s.files=Object.assign(cl(treeOf(s,up)),untracked(s));r.out(`Avance rápido de ${curName(s)||'HEAD'} hasta ${t}.`);r.ev('fast-forward',{ref:curName(s)||'HEAD',theirs:t,from:ours,to:up});return;}
  const U=anc(s,up),O=anc(s,ours);const todo=s.order.filter(h=>O[h]&&!U[h]&&s.commits[h].parents.length<2);
  s.op={kind:'rebase',onto:up,ontoName:t,todo,pairs:[],branch:curName(s),orig:ours,ut:untracked(s),lane:laneActual(s),conflicts:[]};
  setHead(s,up,'rebase (start): checkout '+t);s.index=cl(treeOf(s,up));s.files=Object.assign(cl(treeOf(s,up)),s.op.ut);procesarRebase(s,r);},
'cherry-pick'(s,a,r){return opAplicar(s,a,r,'cherry-pick');},
revert(s,a,r){return opAplicar(s,a,r,'revert');},
reset(s,a,r){let mode='mixed';if(a.includes('--soft'))mode='soft';if(a.includes('--hard'))mode='hard';const ps=a.filter(x=>!x.startsWith('-'));
  if(s.op&&s.op.kind==='rebase')fail('Estás en mitad de un rebase.','Primero cancélalo con git rebase --abort.');
  if(!headHash(s))fail('fatal: todavía no hay commits a los que volver');
  if(ps.length&&!resolve(s,ps[0])&&(ps[0] in s.index||ps[0] in treeOf(s,headHash(s)))){return GIT.restore(s,['--staged',...ps],r);}
  const ref=ps[0]||'HEAD',to=resolveOr(s,ref),from=headHash(s);const ut=untracked(s);const count=Object.keys(anc(s,from)).filter(h=>!anc(s,to)[h]).length;
  const prevOp=s.op;s.op=null;setHead(s,to,`reset: moving to ${ref}`);const T=treeOf(s,to);
  if(mode!=='soft')s.index=cl(T);if(mode==='hard'){s.files=Object.assign(cl(T),ut);r.out(`HEAD está ahora en ${C('y',short(to))} ${s.commits[to].msg}`);}
  else if(mode==='mixed'){const e=estadoArchivos(s);if(e.un.length)r.out('Cambios fuera del área de stage tras el reset:',...e.un.map(x=>C('r','M\t'+x.f)));}
  r.ev('reset',{mode,from,to,count,ref,aborted:prevOp&&prevOp.kind});},
stash(s,a,r){const sub=a[0]&&!a[0].startsWith('-')?a[0]:'push';const rest=sub===a[0]?a.slice(1):a;
  const idx=()=>{const x=rest.find(y=>!y.startsWith('-'));if(!x)return 0;const m=/(\d+)/.exec(x);const i=m?+m[1]:0;if(!s.stash[i])fail(`error: ${x} no es una referencia de stash válida`,'Mira tus stashes con git stash list.');return i;};
  if(sub==='list'){s.stash.forEach((e,i)=>r.out(C('y',`stash@{${i}}`)+': '+e.msg));if(!s.stash.length)r.out(M('(el stash está vacío)'));return;}
  if(sub==='show'){if(!s.stash.length)fail('error: no hay entradas en el stash');const e=s.stash[idx()];r.out(...Object.keys(e.w).map(f=>' '+f));return;}
  if(sub==='drop'||sub==='clear'){if(!s.stash.length)fail('error: no hay entradas en el stash');if(sub==='clear'){s.stash=[];r.ev('stash-dropped');return;}const i=idx();s.stash.splice(i,1);r.out(`Descartado refs/stash@{${i}}`);r.ev('stash-dropped');return;}
  if(sub==='pop'||sub==='apply'){if(!s.stash.length)fail('error: no hay entradas en el stash','Guarda cambios primero con git stash.');const i=idx(),e=s.stash[i],H=treeOf(s,headHash(s));
    for(const f in e.w){if(s.files[f]!==s.index[f]&&(f in s.index||f in s.files)&&s.files[f]!==(e.w[f]??undefined)||s.index[f]!==H[f])fail(`error: tus cambios locales en '${f}' serían sobrescritos`,'Haz commit o descarta esos cambios antes de recuperar el stash.');}
    for(const f in e.w){setK(s.files,f,e.w[f]);if(e.i[f]!=null&&H[f]===undefined)s.index[f]=e.i[f];}
    if(sub==='pop'){s.stash.splice(i,1);r.out(`Descartado refs/stash@{${i}}`);}r.ev('stash-popped',{files:Object.keys(e.w),drop:sub==='pop'});GIT.status(s,[],r);return;}
  if(sub!=='push'&&sub!=='save')fail(`error: subcomando de stash desconocido: ${sub}`,'Usa git stash, stash list, stash pop, stash apply o stash drop.');
  const h=headHash(s);if(!h)fail('No puedes hacer stash antes del primer commit.');const e0=estadoArchivos(s);if(e0.conf.length)fail('error: no puedes hacer stash con conflictos sin resolver.');
  const inclU=rest.includes('-u')||rest.includes('--include-untracked');const fs=[...new Set([...e0.st,...e0.un].map(x=>x.f).concat(inclU?e0.ut.map(x=>x.f):[]))];
  if(!fs.length){r.out('No hay cambios locales para guardar'+(e0.ut.length?M(' (los archivos sin seguimiento no se guardan; usa git stash -u)'):''));return;}
  const mi=rest.indexOf('-m');const c=s.commits[h];const e={msg:mi>=0&&rest[mi+1]?`On ${curName(s)||'HEAD'}: ${rest[mi+1]}`:`WIP en ${curName(s)||'HEAD'}: ${short(h)} ${c.msg}`,base:h,w:{},i:{}};
  const H=c.tree;for(const f of fs){e.w[f]=s.files[f]??null;e.i[f]=s.index[f]??null;setK(s.files,f,H[f]);setK(s.index,f,H[f]);}
  s.stash.unshift(e);r.out('Directorio de trabajo y estado de índice guardados: '+e.msg);r.ev('stash-pushed',{files:fs});},
reflog(s,a,r){if(!s.reflog.length){r.out(M('(el reflog está vacío)'));return;}s.reflog.forEach((e,i)=>r.out(C('y',short(e.h))+' '+C('h',`HEAD@{${i}}`)+': '+e.msg));},
remote(s,a,r){if(a[0]==='add'||a[0]==='remove'||a[0]==='rm')fail('El simulador tiene un único remoto fijo llamado origin.','Úsalo con git push, git fetch y git pull.');if(a.includes('-v'))r.out('origin\thttps://example.com/tu/proyecto.git (fetch)','origin\thttps://example.com/tu/proyecto.git (push)');else r.out('origin');},
push(s,a,r){const u=a.includes('-u')||a.includes('--set-upstream'),force=a.includes('-f')||a.includes('--force');const ps=a.filter(x=>!x.startsWith('-'));const rem=ps[0];let b=ps[1];
  if(rem&&rem!=='origin')fail(`fatal: '${rem}' no parece ser un repositorio git`,'El único remoto es origin. Ejemplo: git push -u origin main');
  const cur=curName(s);if(!b){if(!cur)fail('fatal: no estás en una rama.','Crea una con git switch -c <nombre> y vuelve a intentarlo.');b=cur;
    if(!rem&&!s.upstream[cur])fail(`fatal: la rama actual ${cur} no tiene rama remota (upstream).`,'',C('m','Para subirla y enlazarla con origin, usa:'),'',`    git push -u origin ${cur}`);}
  const loc=s.branches[b];if(!loc)fail(`error: src refspec ${b} no coincide con ninguna rama`,'Mira tus ramas con git branch.');
  const rh=s.remote.branches[b];
  if(rh===loc){r.out('Todo actualizado');}
  else if(rh&&!isAnc(s,rh,loc)&&!force){fail(`! [rechazado]        ${b} -> ${b} (fetch first)`,C('e',"error: falló el push de algunas referencias a 'origin'"),'origin tiene commits que tú no tienes. Primero tráelos con git pull y luego vuelve a hacer push.');}
  else{const nuevos=s.order.filter(h=>anc(s,loc)[h]&&!s.remote.known[h]);nuevos.forEach(h=>s.remote.known[h]=1);s.remote.branches[b]=loc;s.tracking[b]=loc;
    r.out(`Enviando ${pl(nuevos.length,'commit','commits')}...`,'To https://example.com/tu/proyecto.git',rh?`   ${short(rh)}..${short(loc)}  ${b} -> ${b}${force&&!isAnc(s,rh,loc)?' (forzado)':''}`:` * [nueva rama]      ${b} -> ${b}`);r.ev('push-sent',{branch:b,hashes:nuevos});}
  if(u){s.upstream[b]=b;r.out(`rama '${b}' configurada para rastrear 'origin/${b}'.`);}},
fetch(s,a,r){const got=[],lines=[];for(const b in s.remote.branches){const h=s.remote.branches[b];for(const x of s.order)if(anc(s,h)[x]&&!s.commits[x].local){s.commits[x].local=true;got.push(x);}
    if(s.tracking[b]!==h){lines.push(s.tracking[b]?`   ${short(s.tracking[b])}..${short(h)}  ${b.padEnd(10)} -> origin/${b}`:` * [nueva rama]      ${b.padEnd(10)} -> origin/${b}`);s.tracking[b]=h;}}
  if(lines.length)r.out('Desde https://example.com/tu/proyecto',...lines);else r.out(M('Nada nuevo en origin.'));r.ev('fetch-received',{hashes:got,count:lines.length});},
pull(s,a,r){const cur=curName(s);if(!cur)fail('No estás en ninguna rama.','Cambia a una rama con git switch <rama>.');const up=s.upstream[cur]||(s.remote.branches[cur]?cur:null);
  if(!up)fail(`No hay información de rastreo para la rama actual (${cur}).`,`Sube la rama primero con git push -u origin ${cur}.`);
  if(s.op)fail(`error: hay un ${s.op.kind} en curso`);
  GIT.fetch(s,[],r);if(a.includes('--rebase'))GIT.rebase(s,['origin/'+up],r);else GIT.merge(s,['origin/'+up],r);r.ev('pull-done',{branch:cur});},
clean(s,a,r){const ut=Object.keys(untracked(s));const dry=a.includes('-n')||a.includes('--dry-run');if(!dry&&!a.some(x=>/^-[a-z]*f/.test(x)))fail('fatal: clean.requireForce está activo: usa -n para ver qué se borraría o -f para borrarlo.');
  for(const f of ut){r.out((dry?'Se borraría ':'Borrando ')+f);if(!dry)delete s.files[f];}if(!ut.length)r.out(M('No hay archivos sin seguimiento.'));},
help(s,a,r){r.out(...AYUDA);},
version(s,a,r){r.out('git version 2.47.0 (simulado)');}
};
GIT.checkout.toString;
function opAplicar(s,a,r,kind){
  if(a.includes('--abort')){if(!s.op||s.op.kind!==kind)fail(`fatal: no hay ningún ${kind} en curso`);s.files=s.op.origW;s.index=s.op.origI;s.op=null;r.ev('op-aborted',{kind});return;}
  if(a.includes('--continue')){if(!s.op||s.op.kind!==kind)fail(`fatal: no hay ningún ${kind} en curso`);return GIT.commit(s,[],r);}
  const t=a.find(x=>!x.startsWith('-'));if(!t)fail(`fatal: falta el commit`,`Ejemplo: git ${kind} a1b2c3d (mira los hashes con git log --oneline --all)`);
  if(s.op)fail(`error: ya hay un ${s.op.kind} en curso`);const h=resolveOr(s,t),c=s.commits[h],ours=headHash(s);if(!ours)fail('fatal: tu rama todavía no tiene commits');
  if(c.parents.length>1)fail(`error: ${short(h)} es un commit de merge.`,'El simulador todavía no permite '+kind+' de merges (en Git real necesitarías -m 1). Prueba con un commit normal.');
  if(sucio(s))fail(`error: tus cambios locales serían sobrescritos por ${kind}.`,'Haz commit o guárdalos con git stash primero.');
  const P=treeOf(s,c.parents[0]);const m=kind==='revert'?fusionar3(c.tree,treeOf(s,ours),P):fusionar3(P,treeOf(s,ours),c.tree);
  const msg=kind==='revert'?`Revert "${c.msg}"`:c.msg;
  if(m.conf.length){s.op={kind,other:h,otherName:short(h),conflicts:m.conf,data:m.data,msg,origW:cl(s.files),origI:cl(s.index)};aplicarResultado(s,m,short(h));
    r.out(...m.conf.map(f=>C('e','CONFLICTO (contenido): conflicto de fusión en '+f)),C('e',`error: no se pudo aplicar ${short(h)}... ${c.msg}`),M(`Resuelve el conflicto, usa git add <archivo> y luego git ${kind} --continue (o --abort).`));r.ev('merge-conflict',{files:m.conf,kind});return;}
  if(same(m.tree,treeOf(s,ours)))fail(kind==='revert'?'Nada que revertir: esos cambios ya no están.':'El cherry-pick quedaría vacío: esos cambios ya están en tu rama.');
  const n=nuevoCommit(s,{msg,parents:[ours],tree:m.tree,lane:laneActual(s),author:kind==='revert'?AUTOR:c.author,extra:kind==='revert'?{revertOf:h}:{cherryOf:h}});
  setHead(s,n.hash,`${kind}: ${msg}`);s.index=cl(m.tree);s.files=Object.assign(cl(m.tree),untracked(s));
  r.out(`[${curName(s)||'HEAD separado'} ${C('y',short(n.hash))}] ${msg}`);r.ev(kind==='revert'?'reverted':'cherry-picked',{hash:n.hash,of:h});}

const AYUDA=[C('bold','Comandos disponibles')+M('  (todo ocurre en el simulador)'),
 M('Archivos  ')+'ls · cat · touch · echo "texto" > archivo · echo … >> archivo · rm · mv · edit · clear',
 M('Básico    ')+'git init · status · add <archivo|.> · restore [--staged] · rm · commit -m / -am / --amend',
 M('Historia  ')+'git log [--oneline --graph --all] · show [ref] · diff [--staged] · reflog',
 M('Ramas     ')+'git branch [-d -D -m -a] · switch [-c] · checkout [-b | hash | -- archivo] · tag',
 M('Integrar  ')+'git merge [--no-ff --abort] · rebase [--continue --abort] · cherry-pick <hash>',
 M('Deshacer  ')+'git reset --soft|--mixed|--hard <ref> · revert <hash> · stash [list pop apply drop]',
 M('Remoto    ')+'git remote -v · push [-u origin rama] · fetch · pull',
 M('Refs      ')+'hashes cortos, ramas, HEAD, HEAD~2, HEAD^, origin/main',
 M('Atajos    ')+'↑/↓ historial · Tab autocompleta · Ctrl+L limpia'];

const NO={clone:['copia un repositorio remoto completo','Aquí ya tienes un origin simulado: prueba git fetch o git pull.'],bisect:['busca con búsqueda binaria qué commit introdujo un error','Prueba git log --oneline y git checkout <hash> para visitar commits.'],blame:['muestra quién cambió cada línea de un archivo','Prueba git log o git show <hash>.'],config:['configura tu nombre, email y preferencias','En el simulador ya eres "Tú <tu@ejemplo.com>".'],worktree:['permite tener varias ramas abiertas en carpetas distintas','Usa git switch para cambiar de rama.'],submodule:['incluye otro repositorio dentro de este','No está disponible aquí.'],grep:['busca texto en los archivos del repo','Usa cat <archivo> para ver su contenido.'],describe:['describe un commit usando el tag más cercano','Prueba git tag y git log --oneline.'],shortlog:['resume el log por autor','Prueba git log --oneline.'],gc:['limpia y optimiza el repositorio','En el simulador no hace falta.'],notes:['añade notas a commits','Usa git commit --amend -m para cambiar un mensaje.'],am:['aplica parches desde correos','Prueba git cherry-pick <hash>.'],apply:['aplica un parche','Prueba git cherry-pick <hash>.'],'format-patch':['exporta commits como parches','Prueba git show <hash>.'],mergetool:['abre una herramienta externa para resolver conflictos','Usa el resolvedor visual que aparece al tener un conflicto.'],difftool:['abre una herramienta externa de diff','Usa git diff.'],archive:['empaqueta el repo en un .zip o .tar','No está disponible aquí.'],'sparse-checkout':['descarga solo parte de un repo','No está disponible aquí.'],fsck:['verifica la integridad del repo','El simulador siempre está íntegro.'],prune:['borra objetos inalcanzables','Los commits fantasma se quedan visibles para que aprendas de ellos.'],'filter-branch':['reescribe toda la historia','Prueba git rebase o git reset.'],'range-diff':['compara dos rangos de commits','Prueba git log --oneline --all.'],cherry:['lista commits no aplicados en otra rama','Prueba git log --oneline --all.'],bundle:['empaqueta el repo en un archivo','No está disponible aquí.'],maintenance:['tareas de mantenimiento','En el simulador no hace falta.']};
const SHELL=['ls','cat','touch','echo','rm','mv','clear','help','edit','pwd','cd','mkdir'];

function validName(f){return /^[\w.\-]+$/.test(f)&&f!=='.'&&f!=='..'&&f!=='.git';}
function shell(s,cmd,a,r){
  switch(cmd){
  case 'help':return GIT.help(s,a,r);
  case 'ls':{const fs=Object.keys(s.files).sort();const all=a.some(x=>/^-\w*a/.test(x));const L=(all&&s.inited?['.git']:[]).concat(fs);if(L.length)r.out(L.map(f=>f==='.git'?M(f):f).join('   '));return;}
  case 'pwd':r.out('/home/tu/proyecto');return;
  case 'cd':r.out(M('En el simulador trabajas siempre en ~/proyecto (sin carpetas).'));return;
  case 'mkdir':fail('mkdir: el simulador todavía no admite carpetas.','Crea archivos sueltos con touch o echo.');
  case 'cat':{if(!a.length)fail('uso: cat <archivo>');for(const f of a){if(!(f in s.files))fail(`cat: ${f}: No existe el archivo`,'Mira qué archivos hay con ls.');const t=s.files[f];r.out(...(t===''?[M('(archivo vacío)')]:t.split('\n')));}return;}
  case 'touch':{if(!a.length)fail('uso: touch <archivo>');for(const f of a){if(!validName(f))fail(`touch: nombre no válido: ${f}`,'Usa letras, números, puntos y guiones (sin carpetas).');if(!(f in s.files))s.files[f]='';}return;}
  case 'edit':{const f=a[0];if(!f)fail('uso: edit <archivo>');if(!validName(f))fail(`edit: nombre no válido: ${f}`);r.accion={tipo:'editar',archivo:f};return;}
  case 'echo':{const i=a.findIndex(x=>x==='>'||x==='>>');const text=(i<0?a:a.slice(0,i)).join(' ');if(i<0){r.out(text);return;}const f=a[i+1];if(!f)fail('echo: falta el archivo después de '+a[i]);if(!validName(f))fail(`echo: nombre de archivo no válido: ${f}`);
    if(a[i]==='>')s.files[f]=text;else s.files[f]=(s.files[f]?s.files[f]+'\n':'')+text;return;}
  case 'rm':{const ps=a.filter(x=>!x.startsWith('-'));if(!ps.length)fail('uso: rm <archivo>');for(const f of ps){if(f==='.git')fail('rm: mejor no: borrarías todo el historial.','Si quieres empezar de cero usa el botón "Reiniciar repositorio".');if(!(f in s.files))fail(`rm: no se puede borrar '${f}': No existe el archivo`);delete s.files[f];}return;}
  case 'mv':{if(a.length!==2)fail('uso: mv <origen> <destino>');const [x,y]=a;if(!(x in s.files))fail(`mv: no se puede mover '${x}': No existe el archivo`);if(!validName(y))fail('mv: nombre de destino no válido');s.files[y]=s.files[x];delete s.files[x];return;}
  }}

function diffEventos(p,s,r){const E=[];const ph=headHash(p),nh=headHash(s);
  for(const f of keys(p.files,s.files)){const a=p.files[f],b=s.files[f];if(a===undefined&&b!==undefined)E.push({type:'file-created',file:f});else if(b===undefined&&a!==undefined)E.push({type:'file-deleted',file:f});else if(a!==b)E.push({type:'file-modified',file:f});}
  if(ph===nh){const H=treeOf(s,nh);for(const f of keys(p.index,s.index))if(p.index[f]!==s.index[f])E.push({type:s.index[f]===H[f]?'file-unstaged':'file-staged',file:f});}
  if(ph!==nh||JSON.stringify(p.head)!==JSON.stringify(s.head)){E.push({type:'head-moved',from:ph,to:nh});if(s.head.type==='detached'&&p.head.type!=='detached')E.push({type:'head-detached',to:nh});}
  for(const [k,kind] of [['branches','branch'],['tags','tag'],['tracking','track']])for(const n of keys(p[k],s[k]))if(p[k][n]!==s[k][n])E.push({type:'ref-moved',kind,ref:n,from:p[k][n]||null,to:s[k][n]||null});
  const R=x=>anc(x,headHash(x),...Object.values(x.branches),...Object.values(x.tags),...Object.values(x.tracking));const A=R(p),B=R(s);
  const orf=Object.keys(A).filter(h=>!B[h]),res=Object.keys(B).filter(h=>!A[h]&&p.commits[h]&&p.commits[h].local);
  if(orf.length)E.push({type:'commits-orphaned',hashes:orf});if(res.length)E.push({type:'commits-restored',hashes:res});
  r.eventos.push(...E);}

function mkR(){return {salida:[],eventos:[],accion:null,out(...l){for(const x of l)this.salida.push(...String(x).split('\n'));},ev(type,d){this.eventos.push(Object.assign({type},d||{}));}};}

function unaOrden(s,tk,r){const [cmd,...a]=tk;
  if(cmd==='git'){const sub=a[0];const rest=a.slice(1);
    if(!sub){r.out('uso: git <comando> [<args>]',M('Escribe help para ver todos los comandos.'));return;}
    if(sub==='--version'||sub==='-v')return GIT.version(s,rest,r);if(sub==='--help')return GIT.help(s,rest,r);
    if(NO[sub])fail(`git ${sub} ${NO[sub][0]}, pero el simulador no lo soporta todavía.`,NO[sub][1]);
    if(!GIT[sub]||sub==='toString'){const near=cercano(sub,Object.keys(GIT).concat(Object.keys(NO)));fail(`git: '${sub}' no es un comando de git.`,near?`¿Quisiste decir git ${near}?`:'Escribe help para ver la lista.');}
    if(!s.inited&&!['init','help','version'].includes(sub))fail('fatal: no es un repositorio git (ni ninguno de los directorios superiores): .git','Esta carpeta todavía no es un repositorio. Escribe git init para crearlo.');
    return GIT[sub](s,rest,r);}
  if(SHELL.includes(cmd))return shell(s,cmd,a,r);
  if(['gti','got','gi','gitt','tig'].includes(cmd)||lev(cmd,'git')===1)fail(`comando no encontrado: ${cmd}`,`¿Quisiste decir git ${a.join(' ')}?`);
  if(['vim','vi','nano','code','emacs'].includes(cmd))fail(`${cmd} no está disponible en el simulador.`,`Usa edit ${a[0]||'<archivo>'} para abrir el mini editor.`);
  if(['sudo','npm','node','python','curl','wget','ssh'].includes(cmd))fail(`${cmd}: este terminal solo simula Git y algunos comandos de archivos.`,'Nada se ejecuta en tu ordenador. Escribe help para ver qué puedes usar.');
  const near=cercano(cmd,SHELL.concat(['git']));fail(`comando no encontrado: ${cmd}`,near?`¿Quisiste decir ${near}?`:'Escribe help para ver los comandos disponibles.');}

function ejecutar(estado,entrada){const raw=(entrada||'').trim();if(!raw)return {estado,salida:[],eventos:[]};
  const tk=tokens(raw);if(!tk)return {estado,salida:[C('e','Faltan comillas de cierre.'),M('Revisa que el mensaje empiece y termine con comillas: git commit -m "mi mensaje"')],eventos:[{type:'error'}],error:true};
  const s=cl(estado),r=mkR();const groups=[[]];for(const t of tk){if(t==='&&'||t===';')groups.push([]);else groups[groups.length-1].push(t);}
  try{for(const g of groups)if(g.length)unaOrden(s,g,r);}
  catch(e){if(e instanceof GitError)return {estado:r.salida.length?estado:estado,salida:r.salida.concat(e.lines),eventos:[{type:'error'}],error:true};console.error(e);return {estado,salida:[C('e','Error interno del simulador: '+e.message),M('Tu repositorio no ha cambiado.')],eventos:[{type:'error'}],error:true};}
  diffEventos(estado,s,r);return {estado:s,salida:r.salida,eventos:r.eventos,accion:r.accion,error:false};}
function envolver(estado,fn){const s=cl(estado),r=mkR();try{fn(s,r);}catch(e){if(e instanceof GitError)return {estado,salida:e.lines,eventos:[{type:'error'}],error:true};throw e;}diffEventos(estado,s,r);return {estado:s,salida:r.salida,eventos:r.eventos,error:false};}
function escribir(estado,f,txt){return envolver(estado,s=>{s.files[f]=txt;});}
function resolver(estado,f,modo){return envolver(estado,(s,r)=>{const d=s.op&&s.op.data&&s.op.data[f];if(!d)fail('No hay conflicto en '+f);
  const v=modo==='mia'?d.ours:modo==='suya'?d.theirs:[d.ours,d.theirs].filter(x=>x!=null).join('\n');setK(s.files,f,v);
  r.out(M(`Resolviste ${f} (${modo==='mia'?'tu versión':modo==='suya'?'la otra versión':'ambas versiones'}). Ahora márcalo con: git add ${f}`));});}
const NOTAS=['Añade notas de la reunión','Actualiza la lista de tareas','Corrige una errata en las notas','Apunta ideas para la próxima versión','Añade enlaces útiles'];
function companero(estado){return envolver(estado,(s,r)=>{const b=s.remote.branches.main?'main':Object.keys(s.remote.branches)[0];if(!b)fail('origin está vacío.','Primero sube tu rama con git push -u origin main.');
  s.tm=(s.tm||0)+1;const base=s.commits[s.remote.branches[b]];const tree=cl(base.tree);tree['equipo.md']=(tree['equipo.md']||'# Notas del equipo')+`\n- Nota ${s.tm} de Lucía`;
  const c=nuevoCommit(s,{msg:NOTAS[(s.tm-1)%NOTAS.length],parents:[base.hash],tree,lane:laneFor(s,b),author:'Lucía <lucia@ejemplo.com>',extra:{local:false}});
  s.remote.branches[b]=c.hash;s.remote.known[c.hash]=1;r.out(M(`Lucía subió "${c.msg}" a origin/${b}. Tu repositorio aún no lo sabe: prueba git fetch.`));r.ev('remote-commit',{hash:c.hash,branch:b});});}
function ejemplo(){const s=vacio();s.inited=true;ensureColor(s,'main');const lane=laneFor(s,'main');const t0=Date.UTC(2026,9,6,9,12);
  const c1=nuevoCommit(s,{msg:'Primer commit',parents:[],tree:{'README.md':'# Mi proyecto'},lane,t:t0});s.branches.main=c1.hash;reflogPush(s,'commit (initial): Primer commit');
  const c2=nuevoCommit(s,{msg:'Añade descripción al README',parents:[c1.hash],tree:{'README.md':'# Mi proyecto\n\nUn lugar para practicar Git sin miedo.'},lane,t:t0+3600e3});s.branches.main=c2.hash;reflogPush(s,'commit: Añade descripción al README');
  s.files=cl(c2.tree);s.index=cl(c2.tree);s.remote.branches.main=c2.hash;s.remote.known[c1.hash]=1;s.remote.known[c2.hash]=1;s.tracking.main=c2.hash;s.upstream.main='main';return s;}

function explicar(E,s){const g=t=>E.find(e=>e.type===t);const code=x=>'`'+x+'`';const cur=curName(s);let e;
  const orf=g('commits-orphaned');const n=orf?orf.hashes.length:0;
  if(g('error'))return null;
  if((e=g('merge-conflict')))return {icon:'!',tone:'danger',text:`Conflicto: los dos lados cambiaron ${e.files.map(code).join(', ')}. Elige una versión, luego ${code('git add')} y ${e.kind==='rebase'?code('git rebase --continue'):e.kind==='merge'?code('git commit'):code('git '+e.kind+' --continue')}.`};
  if((e=g('rebase-done')))return {icon:'↷',tone:'info',text:`Rebase: ${pl(e.count,'commit se copió','commits se copiaron')} sobre ${code(e.onto)}. Los originales quedan como fantasma.`};
  if(g('pull-done')&&(e=g('merge-commit')||g('fast-forward')))return {icon:'↓',tone:'info',text:`Trajiste los cambios de origin y los uniste a ${code(cur)}.`};
  if(g('pull-done')&&g('up-to-date'))return {icon:'↓',tone:'info',text:`Tu rama ya tenía todo lo de origin.`};
  if((e=g('merge-commit')))return {icon:'⑂',tone:'success',text:`Uniste ${code(e.theirs)} en ${code(e.into)} con un commit de merge: tiene dos padres.`};
  if((e=g('fast-forward')))return {icon:'→',tone:'success',text:`${code(e.ref)} avanzó directamente hasta ${code(e.theirs)}. No hizo falta commit de merge (fast-forward).`};
  if((e=g('commit-amended')))return {icon:'✎',tone:'info',text:'Reemplazaste el último commit por uno nuevo. El antiguo queda como fantasma.'};
  if((e=g('commit-created')))return {icon:'+',tone:'success',text:e.root?`Primer commit: aquí empieza la historia de ${code(e.branch||'HEAD')}.`:e.branch?`Creaste un commit nuevo. ${code(e.branch)} avanzó y HEAD la siguió.`:`Creaste un commit con HEAD separado: ninguna rama lo apunta. Guárdalo con ${code('git switch -c <rama>')}.`};
  if((e=g('cherry-picked')))return {icon:'⧉',tone:'success',text:`Copiaste ${code(short(e.of))} encima de ${code(cur||'HEAD')} como un commit nuevo.`};
  if((e=g('reverted')))return {icon:'↺',tone:'success',text:`Creaste un commit que deshace ${code(short(e.of))} sin borrar la historia.`};
  if((e=g('reset'))){const w={soft:'Sus cambios siguen preparados en staging.',mixed:'Sus cambios siguen en tus archivos, sin preparar.',hard:'Los cambios se descartaron.'}[e.mode];return {icon:'↺',tone:e.mode==='hard'?'warning':'info',text:e.count?`${code(cur||'HEAD')} retrocedió ${pl(e.count,'commit','commits')} (--${e.mode}). ${w}`:e.mode==='hard'?'Descartaste todos los cambios sin commit (reset --hard).':'Sacaste los cambios del staging.'};}
  if((e=g('op-aborted')))return {icon:'↺',tone:'info',text:`Cancelaste el ${e.kind}. Todo vuelve a como estaba.`};
  if((e=g('stash-pushed')))return {icon:'≡',tone:'info',text:`Guardaste ${pl(e.files.length,'cambio','cambios')} en el stash. Tu working directory quedó limpio.`};
  if((e=g('stash-popped')))return {icon:'≡',tone:'info',text:`Recuperaste los cambios del stash${e.drop?' y se borró de la pila':''}.`};
  if((e=g('push-sent')))return {icon:'↑',tone:'success',text:`Enviaste ${pl(e.hashes.length,'commit','commits')} a origin. ${code('origin/'+e.branch)} se actualizó.`};
  if((e=g('fetch-received')))return e.count?{icon:'↓',tone:'info',text:`Trajiste ${pl(e.hashes.length,'commit','commits')} de origin. Aún no están en tu rama: usa ${code('git merge origin/main')} o ${code('git pull')}.`}:{icon:'↓',tone:'info',text:'Nada nuevo en origin.'};
  if((e=g('remote-commit')))return {icon:'↑',tone:'info',text:`Lucía subió un commit a ${code('origin/'+e.branch)}. Tu repositorio aún no lo sabe: prueba ${code('git fetch')}.`};
  if((e=g('switched')))return {icon:'⇄',tone:'info',text:`${e.created?'Creaste la rama '+code(e.name)+' y ':''}${e.created?'ahora':'Ahora'} estás en ${code(e.name)}. Tus archivos muestran su versión.`};
  if((e=g('branch-created')))return {icon:'⑂',tone:'success',text:`Creaste la rama ${code(e.name)}: es solo una etiqueta que apunta al commit actual.`};
  if((e=g('branch-deleted')))return {icon:'−',tone:'info',text:`Borraste la rama ${code(e.name)}.`+(n?` ${pl(n,'commit quedó','commits quedaron')} sin referencia (fantasma).`:' Sus commits siguen en otra rama.')};
  if((e=g('branch-renamed')))return {icon:'✎',tone:'info',text:`Renombraste ${code(e.from)} a ${code(e.to)}.`};
  if((e=g('detached')))return {icon:'!',tone:'warning',text:'HEAD apunta directamente a un commit (separado). Puedes mirar y experimentar sin miedo.'};
  if((e=g('tag-created')))return {icon:'◆',tone:'success',text:`Etiquetaste ${code(short(e.hash))} como ${code(e.name)}. Un tag nunca se mueve.`};
  if((e=g('tag-deleted')))return {icon:'◆',tone:'info',text:`Borraste el tag ${code(e.name)}.`};
  if(g('repo-init'))return {icon:'+',tone:'success',text:'Creaste un repositorio vacío. Git ya vigila esta carpeta.'};
  if((e=g('file-restored')))return {icon:'↺',tone:'info',text:`Descartaste los cambios de ${e.files.map(code).join(', ')}: vuelve a la versión guardada.`};
  const st=E.filter(x=>x.type==='file-staged'),us=E.filter(x=>x.type==='file-unstaged');
  if(st.length)return {icon:'→',tone:'success',text:st.length===1?`Preparaste ${code(st[0].file)} para el próximo commit (staging).`:`Preparaste ${st.length} archivos para el próximo commit.`};
  if(us.length)return {icon:'←',tone:'info',text:us.length===1?`Sacaste ${code(us[0].file)} del staging. Tus cambios siguen en el archivo.`:`Sacaste ${us.length} archivos del staging.`};
  if((e=g('file-created')))return {icon:'+',tone:'info',text:s.inited?`Creaste ${code(e.file)}. Git lo ve como archivo sin seguimiento.`:`Creaste ${code(e.file)}.`};
  if((e=g('file-modified')))return {icon:'~',tone:'warning',text:`Modificaste ${code(e.file)}. Git ve el cambio, pero aún no está preparado.`};
  if((e=g('file-deleted')))return {icon:'−',tone:'info',text:`Borraste ${code(e.file)}.`};
  return null;}

function layout(s){
  const hh=headHash(s);const extra=s.op&&s.op.other?[s.op.other]:[];
  const R=anc(s,hh,...Object.values(s.branches),...Object.values(s.tags),...extra),T=anc(s,...Object.values(s.tracking));
  const pos={},nodes=[],edges=[],links=[],labels=[];
  for(const h of s.order){const c=s.commits[h];if(!c.local)continue;const X=c.x*DX,Y=c.lane*DY+(c.dy||0);pos[h]={X,Y};
    nodes.push({h,X,Y,color:s.lanes[c.lane].color,merge:c.parents.length>1,ghost:!R[h]&&!T[h],dim:!R[h]&&!!T[h],n:c.n,msg:c.msg});}
  const path=(a,b,i,sameLane)=>{if(sameLane||Math.abs(b.X-a.X)<=DX)return `M${a.X},${a.Y} C${a.X+DX*.55},${a.Y} ${b.X-DX*.55},${b.Y} ${b.X},${b.Y}`;
    if(i===0)return `M${a.X},${a.Y} C${a.X+DX*.55},${a.Y} ${a.X+DX*.45},${b.Y} ${a.X+DX},${b.Y} L${b.X},${b.Y}`;return `M${a.X},${a.Y} L${b.X-DX},${a.Y} C${b.X-DX*.45},${a.Y} ${b.X-DX*.55},${b.Y} ${b.X},${b.Y}`;};
  for(const nd of nodes){const c=s.commits[nd.h];c.parents.forEach((p,i)=>{if(!pos[p])return;const pc=s.commits[p];edges.push({id:p+'>'+nd.h,child:nd.h,d:path(pos[p],pos[nd.h],i,pc.lane===c.lane&&!c.dy&&!pc.dy),color:i===0?nd.color:s.lanes[pc.lane].color,ghost:nd.ghost});});
    const ref=c.revertOf||c.cherryOf;if(ref&&pos[ref])links.push({id:'l'+nd.h,child:nd.h,d:`M${pos[ref].X},${pos[ref].Y} Q${(pos[ref].X+nd.X)/2},${Math.min(pos[ref].Y,nd.Y)-70} ${nd.X},${nd.Y}`,kind:c.revertOf?'revert':'cherry'});}
  const at={};const add=(h,l)=>{if(!pos[h])return;(at[h]=at[h]||[]).push(l);};
  for(const b in s.tracking)add(s.tracking[b],{key:'t:'+b,kind:'track',text:'origin/'+b,color:colorRama(s,b),ref:b});
  for(const t in s.tags)add(s.tags[t],{key:'g:'+t,kind:'tag',text:t,ref:t});
  const cur=curName(s);for(const b in s.branches)if(b!==cur)add(s.branches[b],{key:'b:'+b,kind:'branch',text:b,color:colorRama(s,b),ref:b});
  if(cur&&s.branches[cur])add(s.branches[cur],{key:'b:'+cur,kind:'branch',text:cur,color:colorRama(s,cur),ref:cur,current:true});
  if(hh)add(hh,{key:'HEAD',kind:'head',text:s.head.type==='detached'?'HEAD (separado)':'HEAD',detached:s.head.type==='detached'});
  for(const h in at){const p=pos[h];at[h].forEach((l,i)=>{l.X=p.X;l.Y=p.Y-36-i*25;l.w=Math.round(l.text.length*7.3+(l.kind==='tag'?30:18));l.h=h;labels.push(l);});}
  let phantom=null;if(s.op&&s.op.conflicts&&s.op.conflicts.length&&pos[hh]){const o=pos[hh],t=pos[s.op.other];const P={X:Math.max(o.X,t?t.X:o.X)+DX,Y:o.Y};phantom={P,edges:[{id:'po',d:path(o,P,0,true)}].concat(t&&t!==o?[{id:'pt',d:path(t,P,1,false)}]:[])};}
  const RR=anc(s,...Object.values(s.remote.branches));const rpos={},rnodes=[],redges=[],rlabels=[];
  for(const h of s.order)if(RR[h]){const c=s.commits[h];const X=c.x*DX,Y=RY-c.lane*RDY;rpos[h]={X,Y};rnodes.push({h,X,Y,color:s.lanes[c.lane].color,merge:c.parents.length>1,n:c.n,msg:c.msg});}
  for(const nd of rnodes)s.commits[nd.h].parents.forEach((p,i)=>{if(rpos[p])redges.push({id:'r'+p+'>'+nd.h,child:nd.h,d:path(rpos[p],rpos[nd.h],i,s.commits[p].lane===s.commits[nd.h].lane),color:nd.color});});
  const rat={};for(const b in s.remote.branches){const h=s.remote.branches[b];(rat[h]=rat[h]||[]).push(b);}
  for(const h in rat)rat[h].forEach((b,i)=>rlabels.push({key:'r:'+b,kind:'rbranch',text:b,color:colorRama(s,b),X:rpos[h].X,Y:rpos[h].Y-30-i*24,w:Math.round(b.length*7.3+18),h,ref:b}));
  let rbox=null;if(rnodes.length){const xs=rnodes.map(n=>n.X),ys=rnodes.map(n=>n.Y).concat(rlabels.map(l=>l.Y));rbox={x0:Math.min(...xs)-60,x1:Math.max(...xs)+60,y0:Math.min(...ys)-44,y1:Math.max(...rnodes.map(n=>n.Y))+40};}
  let stash=null;if(s.stash.length){const minX=nodes.length?Math.min(...nodes.map(n=>n.X)):0;stash={X:minX-160,Y:0,n:s.stash.length};}
  const pts=[];nodes.forEach(n=>pts.push([n.X,n.Y]));labels.forEach(l=>pts.push([l.X-l.w/2,l.Y-10],[l.X+l.w/2,l.Y]));if(rbox)pts.push([rbox.x0,rbox.y0],[rbox.x1,rbox.y1]);if(stash)pts.push([stash.X-50,stash.Y]);if(phantom)pts.push([phantom.P.X,phantom.P.Y]);
  const bbox=pts.length?{x0:Math.min(...pts.map(p=>p[0]))-30,x1:Math.max(...pts.map(p=>p[0]))+30,y0:Math.min(...pts.map(p=>p[1]))-20,y1:Math.max(...pts.map(p=>p[1]))+40}:null;
  return {pos,nodes,edges,links,labels,phantom,rpos,rnodes,redges,rlabels,rbox,stash,bbox};}

function infoRama(s,b){const h=s.branches[b];const r={hash:h,msg:h?s.commits[h].msg:'',actual:curName(s)===b};if(b!=='main'&&s.branches.main&&h){const [a,bh]=aheadBehind(s,h,s.branches.main);r.vsMain=[a,bh];}return r;}
function refsDe(s,h){const L=[];for(const b in s.branches)if(s.branches[b]===h)L.push(b);for(const b in s.tracking)if(s.tracking[b]===h)L.push('origin/'+b);for(const t in s.tags)if(s.tags[t]===h)L.push('tag: '+t);return L;}

// Futura capa de lecciones: { estadoInicial, validar(estado), pistas[] }
window.GitEngine={ejecutar,ejemplo,vacio,escribir,resolver,companero,explicar,layout,estadoArchivos,headHash,treeOf,cambiosCommit,infoRama,refsDe,curName,colorRama,short,resolve,tokens,PALETA,DX,DY,
  completar(s,linea){const parts=linea.split(/\s+/);const last=parts[parts.length-1];let pool;
    if(parts.length===1)pool=SHELL.concat(['git']);else if(parts[0]==='git'&&parts.length===2)pool=Object.keys(GIT).filter(x=>x!=='toString');
    else pool=[...Object.keys(s.branches),...Object.keys(s.tags),...Object.keys(s.files),...Object.keys(s.tracking).map(b=>'origin/'+b),'HEAD','origin','--oneline','--graph','--all','--staged','--soft','--mixed','--hard','--amend','--abort','--continue','--no-ff'];
    pool=[...new Set(pool)].filter(x=>x.startsWith(last)).sort();return {last,pool};}};
})();
