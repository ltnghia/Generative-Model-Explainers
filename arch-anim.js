/* ArchAnim: animated architecture / pipeline diagrams for the explainers.
   A diagram is a spec: nodes (boxes, optionally with a live image, a bar stack or a meter),
   edges (SVG paths with arrowheads), and phases (which boxes light up, which edges carry data,
   and a caption). Phases between loop.from and loop.to repeat loop.count times (the sampling loop).
   Pages pass onIter(i, api) to draw the real intermediate results of iteration i. */
(function(){
"use strict";
const NS='http://www.w3.org/2000/svg';
let UID=0,styled=false;
const REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function S(tag,a,p){const e=document.createElementNS(NS,tag);if(a)for(const k in a)if(a[k]!=null)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function H(tag,cls,p,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(p)p.appendChild(e);return e}

const CSS=`
.aa{display:flex;flex-direction:column;gap:10px}
.aa-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.aa svg{display:block;width:100%;height:auto}
.aa-box{fill:var(--panel);stroke:var(--line);stroke-width:1.4;transition:fill .3s,stroke .3s}
.aa-node{cursor:pointer;transition:opacity .3s}
.aa-node:focus{outline:none}.aa-node:focus-visible .aa-box{stroke:var(--ink);stroke-width:2.5}
.aa-node.on .aa-box{stroke:var(--aa-acc);stroke-width:2.2;fill:color-mix(in srgb,var(--aa-acc) 10%,var(--panel))}
.aa-node.dim{opacity:.5}
.aa-t{font:600 12.5px var(--font-body,system-ui,sans-serif);fill:var(--ink)}
.aa-s{font:400 10.5px var(--font-mono,ui-monospace,monospace);fill:var(--muted)}
.aa-imgbg{fill:var(--soft);stroke:var(--line)}
.aa-edge{fill:none;stroke:var(--muted);stroke-width:1.5;opacity:.45;transition:opacity .3s}
.aa-edge.on{stroke:var(--aa-acc);opacity:1;stroke-width:2;stroke-dasharray:6 5;animation:aa-dash .8s linear infinite}
.aa-ah{fill:var(--muted)}
@keyframes aa-dash{to{stroke-dashoffset:-22}}
.aa-el{font:10.5px var(--font-mono,ui-monospace,monospace);fill:var(--muted)}
.aa-dot{fill:var(--aa-acc);stroke:var(--panel);stroke-width:1.5}
.aa-bars rect{fill:color-mix(in srgb,var(--aa-acc) 20%,var(--panel));stroke:color-mix(in srgb,var(--aa-acc) 50%,var(--line));stroke-width:1;transition:fill .12s}
.aa-bars rect.hot{fill:var(--aa-acc)}
.aa-skip{fill:none;stroke:var(--muted);stroke-width:1.2;stroke-dasharray:3 3;opacity:.7}
.aa-skip.hot{stroke:var(--aa-acc);opacity:1;stroke-width:2}
.aa-mbg{fill:var(--soft)}.aa-m{fill:var(--aa-acc);transition:width .3s}
.aa-badge{font:600 12px var(--font-mono,ui-monospace,monospace);fill:var(--aa-acc)}
.aa-bar{display:flex;align-items:flex-start;gap:10px 14px;flex-wrap:wrap}
.aa-btns{display:flex;gap:6px;flex:none}
.aa-btns button{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;min-width:34px;padding:5px 10px;cursor:pointer;font:500 13px var(--font-body,system-ui)}
.aa-btns button:hover{border-color:var(--ink)}
.aa-btns button.pri{background:var(--aa-acc);border-color:var(--aa-acc);color:#fff;min-width:78px}
.aa-cap{flex:1 1 380px;margin:0;font-size:14.5px;line-height:1.55;min-height:3.1em}
.aa-stg{display:block;font:500 11.5px var(--font-mono,ui-monospace,monospace);color:var(--aa-acc);letter-spacing:.02em;margin-bottom:2px}
.aa-speed{display:flex;align-items:center;gap:6px;font-size:.76rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);flex:none}
.aa-speed select{padding:3px 6px;font-size:.85rem}
/* attach mode: animating a diagram that already exists in the page */
.aa-attached{margin-top:6px;padding:10px 2px 6px;border-top:1px dashed var(--line)}
.aa-badgeh{display:block;font:600 11.5px var(--font-mono,ui-monospace,monospace);color:var(--aa-acc);margin-top:3px}
.flow.aa-run svg.arrows path,.flow.aa-run svg.arrows path.live{opacity:.38;animation:none;transition:opacity .3s}
.flow.aa-run svg.arrows path.on{opacity:1!important;stroke:var(--aa-acc);stroke-width:2.3;stroke-dasharray:6 5;animation:aa-dash .8s linear infinite}
.flow.aa-run svg.arrows path.on.rev{animation-direction:reverse}
.flow.aa-run svg.arrows .aa-dot{fill:var(--aa-acc)}
.flow.aa-run .node{transition:opacity .3s,box-shadow .3s,border-color .3s}
.flow.aa-run .node.dim{opacity:.42}
.flow.aa-run .node.on{border-color:var(--aa-acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--aa-acc) 30%,transparent)}
.flow.aa-run svg rect.hot{opacity:1!important;stroke:var(--ink)!important;stroke-opacity:1!important;stroke-width:1.6;fill-opacity:.95!important}
.flow.aa-run svg path.hot{opacity:1!important;stroke-width:2.6}
@media (prefers-reduced-motion:reduce){.aa-edge.on,.flow.aa-run svg.arrows path.on{animation:none}.aa-box,.aa-node,.flow.aa-run .node{transition:none}}
`;

class ArchAnim{
  constructor(host,spec){
    this.host=host;this.spec=spec;this.uid=++UID;
    if(!styled){styled=true;const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st)}
    if(spec.attach){this.attachTo(spec.attach);return}
    this.root=H('div','aa',host);this.root.style.setProperty('--aa-acc',spec.accent||'var(--ink)');
    const sc=H('div','aa-scroll',this.root);
    const svg=this.svg=S('svg',{viewBox:`0 0 ${spec.w} ${spec.h}`,role:'img','aria-label':spec.label||'Animated architecture diagram'},sc);
    svg.style.minWidth=Math.round(spec.w*.78)+'px';
    const defs=S('defs',null,svg);
    const mk=S('marker',{id:'aah'+this.uid,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'},defs);
    S('path',{d:'M0,0L10,5L0,10z',class:'aa-ah'},mk);
    const gE=S('g',null,svg),gN=S('g',null,svg);this.gP=S('g',null,svg);
    /* edges */
    this.edges={};
    for(const e of spec.edges){
      const p=S('path',{d:e.d,class:'aa-edge','marker-end':`url(#aah${this.uid})`},gE);
      if(e.label){const t=S('text',{x:e.lx,y:e.ly,class:'aa-el','text-anchor':e.anchor||'start'},gE);t.textContent=e.label}
      this.edges[e.id]={el:p,def:e,len:0};
    }
    /* nodes */
    this.nodes={};
    for(const n of spec.nodes){
      const g=S('g',{class:'aa-node',transform:`translate(${n.x},${n.y})`,tabindex:0,role:'button','aria-label':n.t},gN);
      S('rect',{class:'aa-box',width:n.w,height:n.h,rx:10},g);
      if(n.c){const s=S('rect',{x:0,y:10,width:4,height:Math.max(10,n.h-20),rx:2},g);s.style.fill=n.c}
      const t=S('text',{x:12,y:20,class:'aa-t'},g);t.textContent=n.t;
      const subs=(n.s||[]).map((line,i)=>{const s=S('text',{x:12,y:35+i*13,class:'aa-s'},g);s.textContent=line;return s});
      const node={def:n,g,subs,title:t};
      if(n.img){const r=n.img;S('rect',{x:r.x-.5,y:r.y-.5,width:r.w+1,height:r.h+1,rx:4,class:'aa-imgbg'},g);
        node.img=S('image',{x:r.x,y:r.y,width:r.w,height:r.h,preserveAspectRatio:'xMidYMid meet'},g);if(r.pix!==false)node.img.style.imageRendering='pixelated'}
      if(n.bars){const b=n.bars,bg=S('g',{class:'aa-bars',transform:`translate(${b.x},${b.y})`},g);
        node.skips=(b.skips||[]).map(([a,c],k)=>{const A=b.items[a],C=b.items[c];const ax=A.x+A.w/2,cx=C.x+C.w/2,lift=10+k*5;
          return{to:c,el:S('path',{class:'aa-skip',d:`M${ax},${A.y-2} C${ax},${A.y-lift-12} ${cx},${C.y-lift-12} ${cx},${C.y-2}`},bg)}});
        node.bars=b.items.map(it=>S('rect',{x:it.x,y:it.y,width:it.w,height:it.h,rx:Math.min(3,it.w/3)},bg))}
      if(n.meter){const m=n.meter;S('rect',{x:m.x,y:m.y,width:m.w,height:m.h,rx:m.h/2,class:'aa-mbg'},g);
        node.meter=S('rect',{x:m.x,y:m.y,width:0,height:m.h,rx:m.h/2,class:'aa-m'},g);node.meterW=m.w}
      if(n.info){const ti=S('title',null,g);ti.textContent=n.t+'. '+n.info}
      g.addEventListener('click',()=>this.explain(n.id));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.explain(n.id)}});
      this.nodes[n.id]=node;
    }
    const ba=spec.badgeAt||[spec.w-14,spec.h-10];
    this.badge=S('text',{x:ba[0],y:ba[1],class:'aa-badge','text-anchor':'end'},svg);
    this.controls();
  }
  /* animate a diagram that already exists: page nodes, page arrows, page mini-figures */
  attachTo(A){
    const acc=this.spec.accent||'var(--ink)';this.attached=true;
    this.root=H('div','aa aa-attached',A.barHost);this.root.style.setProperty('--aa-acc',acc);
    this.flowEl=A.flow;A.flow.classList.add('aa-run');A.flow.style.setProperty('--aa-acc',acc);
    this.svg=A.svg;this.gP=S('g',{class:'aa-dots'},A.svg);
    this.edges={};for(const id in A.edges){const e=A.ends&&A.ends[id]||[];this.edges[id]={el:A.edges[id],def:{from:e[0],to:e[1]},len:0}}
    this.nodes={};this.onClick=[];
    for(const id in A.nodes){const el=A.nodes[id];if(!el)continue;
      this.nodes[id]={def:{t:((el.querySelector('.t')||el).textContent||'').trim(),info:(A.info||{})[id]||''},g:el,subs:[],barsFn:(A.bars||{})[id]};
      const f=()=>{if(!this.dead)this.explain(id)};el.addEventListener('click',f);this.onClick.push([el,f])}
    this.controls(true);
  }
  controls(attached){
    const bar=H('div','aa-bar',this.root),btns=H('div','aa-btns',bar);
    this.bPrev=H('button','',btns,'‹');this.bPrev.title='Previous stage';this.bPrev.setAttribute('aria-label','Previous stage');
    this.bPlay=H('button','pri',btns,'');
    this.bNext=H('button','',btns,'›');this.bNext.title='Next stage';this.bNext.setAttribute('aria-label','Next stage');
    this.bRe=H('button','',btns,'↺');this.bRe.title='Restart';this.bRe.setAttribute('aria-label','Restart');
    [this.bPrev,this.bPlay,this.bNext,this.bRe].forEach(b=>b.type='button');
    const cw=H('div','aa-cap',bar);this.cap=H('p','',cw);this.cap.style.margin='0';this.cap.setAttribute('aria-live','polite');
    if(attached)this.badge=H('span','aa-badgeh',cw);
    const sp=H('label','aa-speed',bar,'Speed ');const sel=H('select','',sp);sel.id='aa-speed-'+this.uid;sp.htmlFor=sel.id;
    [[.5,'0.5×'],[1,'1×'],[2,'2×'],[4,'4×']].forEach(([v,l])=>sel.add(new Option(l,v)));sel.value='1';
    this.speed=1;sel.addEventListener('change',()=>this.speed=+sel.value);
    this.bPlay.addEventListener('click',()=>{this.playing=!this.playing;if(this.playing&&this.explaining){this.explaining=false;this.go(this.idx)}this.updatePlay()});
    this.bNext.addEventListener('click',()=>{this.explaining=false;this.go(Math.min(this.items.length-1,this.idx+1))});
    this.bPrev.addEventListener('click',()=>{this.explaining=false;this.go(Math.max(0,this.idx-1))});
    this.bRe.addEventListener('click',()=>{this.explaining=false;this.restart()});
    this.playing=!REDUCED;this.visible=true;
    try{this.io=new IntersectionObserver(es=>{this.visible=es[es.length-1].isIntersecting},{threshold:.05});this.io.observe(this.root)}catch(e){}
    this.build();this.restart();this.updatePlay();
    this.last=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  updatePlay(){this.bPlay.textContent=this.playing?'❚❚ Pause':'▶ Play';this.bPlay.setAttribute('aria-label',this.playing?'Pause animation':'Play animation')}
  build(){
    const P=this.spec.phases,L=this.spec.loop||{from:P.length,to:P.length-1,count:0},items=[];
    for(let i=0;i<L.from;i++)items.push({ph:i,iter:0});
    let its=[];for(let i=0;i<L.count;i++)its.push(i);
    if(L.mode==='skip'&&L.count>=5){
      const head=L.keep||2;
      its.slice(0,head).forEach(it=>{for(let ph=L.from;ph<=L.to;ph++)items.push({ph,iter:it})});
      items.push({ff:true,from:head,to:L.count-2});
      for(let ph=L.from;ph<=L.to;ph++)items.push({ph,iter:L.count-1});
    }else its.forEach(it=>{const sc=(L.mode==='compress'&&it>=(L.fastAfter||2))?1/(L.fastScale||3):1;for(let ph=L.from;ph<=L.to;ph++)items.push({ph,iter:it,scale:sc})});
    for(let i=L.to+1;i<P.length;i++)items.push({ph:i,iter:L.count});
    items.push({hold:true,iter:L.count});
    this.items=items;this.L=L;
    this.loopOn=[...new Set(P.slice(L.from,L.to+1).flatMap(p=>p.on||[]))];
    this.loopFlow=[...new Set(P.slice(L.from,L.to+1).flatMap(p=>(p.flow||[]).map(f=>typeof f==='string'?f:f.id)))];
  }
  restart(){this.iter=undefined;this.go(0)}
  setIter(i){if(i===this.iter)return;this.iter=i;try{this.spec.onIter&&this.spec.onIter(i,this)}catch(e){console.error(e)}this.badge.textContent=this.spec.badge?this.spec.badge(i):''}
  go(idx){
    this.idx=idx;this.el=0;const it=this.items[idx],P=this.spec.phases;
    let on,flow,ph=null;
    if(it.ff){on=this.loopOn;flow=this.loopFlow.map(id=>({id,n:2}));this.ffT=0;this.setIter(it.from)}
    else if(it.hold){ph=P[P.length-1];on=ph.on||[];flow=[];this.setIter(it.iter)}
    else{ph=P[it.ph];on=ph.on||[];flow=(ph.flow||[]).map(f=>typeof f==='string'?{id:f}:f);this.setIter(it.iter)}
    this.ph=ph;
    if(this.spec.onPhase){try{this.spec.onPhase(it,this)}catch(e){console.error(e)}}
    for(const id in this.nodes){const g=this.nodes[id].g;g.classList.toggle('on',on.includes(id));g.classList.toggle('dim',on.length>0&&!on.includes(id))}
    for(const id in this.edges)this.edges[id].el.classList.toggle('on',flow.some(f=>f.id===id));
    for(const id in this.nodes){const b=this.barsOf(id);if(b){b.bars.forEach(x=>x.classList.remove('hot'));b.skips.forEach(s=>s.el.classList.remove('hot'))}}
    this.gP.textContent='';
    this.flows=REDUCED?[]:flow.map(f=>{const e=this.edges[f.id];if(!e)return null;if(!e.len)e.len=e.el.getTotalLength();const n=f.n||3;
      const dots=Array.from({length:n},()=>{const c=S('circle',{r:f.r||4.2,class:'aa-dot',opacity:0},this.gP);if(f.c)c.style.fill=f.c;return c});e.el.classList.toggle('rev',!!f.rev);return{e,dots,rev:!!f.rev}}).filter(Boolean);
    const L=this.L,np=P.length;let stg,txt;
    if(it.ff){stg=`Stages ${L.from+1}–${L.to+1} of ${np} · repeating`;txt=typeof this.spec.ffCap==='function'?this.spec.ffCap(it.from,it.to):`The same loop repeats for iterations ${it.from+1} to ${it.to+1}.`}
    else if(it.hold){stg='Finished · restarting';txt=typeof ph.cap==='function'?ph.cap(it.iter):ph.cap}
    else{const inLoop=it.ph>=L.from&&it.ph<=L.to;stg=`Stage ${it.ph+1} of ${np}`+(inLoop?' · inside the loop':'');txt=typeof ph.cap==='function'?ph.cap(it.iter):ph.cap}
    this.cap.innerHTML=`<span class="aa-stg">${stg}</span>${txt}`;
    this.tick(REDUCED?1:0,it);
  }
  dur(it){if(it.ff)return 2600;if(it.hold)return 2600;const ph=this.spec.phases[it.ph];return(ph.dur||this.spec.dur||2500)*(it.scale||1)}
  frame(t){
    const dt=Math.min(100,t-this.last);this.last=t;
    const vis=this.visible&&this.root.isConnected&&this.root.offsetParent!==null&&!document.hidden;
    if(this.playing&&vis&&!this.explaining){
      this.el+=dt*this.speed;const it=this.items[this.idx],d=this.dur(it);
      this.tick(Math.min(1,this.el/d),it,t);
      if(this.el>=d){if(it.hold)this.restart();else this.go(this.idx+1)}
    }
    this.raf=requestAnimationFrame(x=>this.frame(x));
  }
  tick(p,it,t){
    for(const f of this.flows){const n=f.dots.length;f.dots.forEach((d,j)=>{
      const q=it.ff?((p*7+j/n)%1):(p*1.35-j*.17);
      if(q<=0||q>=1){d.setAttribute('opacity',0);return}
      const pt=f.e.el.getPointAtLength((f.rev?1-q:q)*f.e.len);d.setAttribute('cx',pt.x);d.setAttribute('cy',pt.y);d.setAttribute('opacity',Math.min(1,Math.min(q,1-q)*8))})}
    const sw=it.ff?this.loopSweeps():(this.ph&&this.ph.sweep?[].concat(this.ph.sweep):[]);
    const ps=it.ff?(p*5)%1:p;
    const rev=!it.ff&&this.ph&&this.ph.sweepRev,seq=!it.ff&&this.ph&&this.ph.sweepSeq;
    if(seq){/* one sweep running through several networks in turn */
      let all=[];sw.forEach(id=>{const n=this.barsOf(id);if(n)all=all.concat(n.bars.map((el,i)=>({el,i,n})))});if(rev)all.reverse();
      const hot=Math.min(all.length-1,Math.floor(ps*all.length));all.forEach((x,j)=>x.el.classList.toggle('hot',j===hot));
      const h=all[hot];sw.forEach(id=>{const n=this.barsOf(id);if(n)n.skips.forEach(s=>s.el.classList.toggle('hot',!!h&&h.n.bars===n.bars&&s.to===h.i))});
    }else for(const id of sw){const n=this.barsOf(id);if(!n||!n.bars.length)continue;const k=n.bars.length;let hot=Math.min(k-1,Math.floor(ps*k));if(rev)hot=k-1-hot;
      n.bars.forEach((b,i)=>b.classList.toggle('hot',i===hot));n.skips.forEach(s=>s.el.classList.toggle('hot',s.to===hot))}
    if(it.ff&&t!=null){const i=Math.min(it.to,it.from+Math.floor(p*(it.to-it.from+1)));if(i!==this.iter&&t-this.ffT>110){this.ffT=t;this.setIter(i)}}
    if(this.ph&&this.ph.tick)this.ph.tick(p,this);
  }
  barsOf(id){const n=this.nodes[id];if(!n)return null;if(n.barsFn){try{const r=n.barsFn();return r?{bars:r.bars||[],skips:r.skips||[]}:null}catch(e){return null}}return n.bars?{bars:n.bars,skips:n.skips||[]}:null}
  loopSweeps(){const P=this.spec.phases,L=this.L;return[...new Set(P.slice(L.from,L.to+1).flatMap(p=>p.sweep?[].concat(p.sweep):[]))]}
  explain(id){const n=this.nodes[id];if(!n)return;this.explaining=true;this.playing=false;this.updatePlay();
    for(const k in this.nodes){this.nodes[k].g.classList.toggle('on',k===id);this.nodes[k].g.classList.toggle('dim',k!==id)}
    const used=new Set(this.spec.phases.flatMap(p=>(p.flow||[]).map(f=>typeof f==='string'?f:f.id)));
    for(const k in this.edges){const d=this.edges[k].def;this.edges[k].el.classList.toggle('on',used.has(k)&&(d.from===id||d.to===id));this.edges[k].el.classList.remove('rev')}
    this.gP.textContent='';this.flows=[];
    this.cap.innerHTML=`<span class="aa-stg">Component · press Play to continue</span><b>${n.def.t}.</b> ${n.def.info||(this.attached?'Its description is open in the details panel below.':'')}`}
  /* API used by pages */
  setImg(id,canvas){const n=this.nodes[id];if(!n||!n.img)return;if(canvas)n.img.setAttribute('href',canvas.toDataURL());else n.img.removeAttribute('href')}
  setSub(id,i,text){const n=this.nodes[id];if(n&&n.subs[i])n.subs[i].textContent=text}
  setTitle(id,text){const n=this.nodes[id];if(n)n.title.textContent=text}
  setMeter(id,f){const n=this.nodes[id];if(n&&n.meter)n.meter.setAttribute('width',Math.max(0,Math.min(1,f))*n.meterW)}
  destroy(){this.dead=true;cancelAnimationFrame(this.raf);try{this.io&&this.io.disconnect()}catch(e){}this.root.remove();
    if(this.attached){this.gP.remove();(this.onClick||[]).forEach(([el,f])=>el.removeEventListener('click',f));
      for(const id in this.nodes)this.nodes[id].g.classList.remove('on','dim');for(const id in this.edges)this.edges[id].el.classList.remove('on','rev');
      for(const id in this.nodes){const b=this.barsOf(id);if(b){b.bars.forEach(x=>x.classList.remove('hot'));b.skips.forEach(s=>s.el.classList.remove('hot'))}}
      this.flowEl.classList.remove('aa-run')}}
  /* layout helpers */
  static unet(w,h){const hs=[1,.78,.58,.42,.3,.42,.58,.78,1],n=hs.length,step=w/n,bw=Math.min(18,step*.55);
    return{items:hs.map((f,i)=>({x:i*step+(step-bw)/2,y:(h-h*f)/2,w:bw,h:h*f})),skips:[[3,5],[2,6],[1,7],[0,8]]}}
  static stack(n,w,h){const step=w/n;return{items:Array.from({length:n},(_,i)=>({x:i*step+step*.15,y:0,w:step*.7,h}))}}
}
window.ArchAnim=ArchAnim;
})();
