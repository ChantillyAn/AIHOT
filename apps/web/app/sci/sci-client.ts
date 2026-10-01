// 首页的交互：纸片归位、搜索、小人、划重点、翻牌、分享图、栏目内页与「关于」。
// 逻辑来自定稿原型（claude/sci-homepage-prototype.html），只把内置示例换成了接口数据。
/* eslint-disable */
// @ts-nocheck
import type { SciData } from "./types";

let started = false;

export function initSci(data: SciData) {
  if (started) return;
  started = true;

  /* 品牌签名下面那一笔（算法同 guangyi-site/brand/stroke.ts） */
  function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function drawStroke(cv,seed,progress,col){
    var ctx=cv.getContext('2d');if(!ctx)return;var W=cv.width,H=cv.height,r=rng(seed);
    var len=.92+r()*.08,peak=.26+r()*.16,heavy=.86+r()*.2,lift=.26+r()*.1,tail=.12+r()*.09,wob=(.5+r()*.9)*(H/74),ph1=r()*Math.PI*2,ph2=r()*Math.PI*2;
    var N=200,padL=W*.012,span=(W-padL*2)*len,top=[],bot=[];
    for(var i=0;i<N;i++){var u=i/(N-1),px=padL+span*u;var py=H*.6-Math.pow(u,1.15)*H*lift;py+=Math.sin(u*7.1+ph1)*wob+Math.sin(u*3.3+ph2)*wob*.6;
      var d=(u-peak)/(u<peak?peak:1-peak);var w=(1-d*d*(u<peak?.86:.94))*H*.2*heavy;var en=Math.min(1,u/.045),ex=Math.min(1,(1-u)/tail);w=Math.max(.35,w)*Math.pow(en,.65)*Math.pow(ex,1.6);
      top.push([px,py-w]);bot.push([px,py+w*.7])}
    var k=Math.max(2,Math.round(N*progress));ctx.clearRect(0,0,W,H);ctx.beginPath();ctx.moveTo(top[0][0],top[0][1]);
    for(i=1;i<k;i++)ctx.lineTo(top[i][0],top[i][1]);for(i=k-1;i>=0;i--)ctx.lineTo(bot[i][0],bot[i][1]);ctx.closePath();ctx.fillStyle=col||getComputedStyle(cv).color;ctx.fill();
  }
  var sigCvs=[].slice.call(document.querySelectorAll('.sigcv')),sigSeed=(Date.now()^(Math.random()*1e9))>>>0;
  function drawSigs(){sigCvs.forEach(function(cv){drawStroke(cv,sigSeed,1)})}
  drawSigs();

  var ITEMS=data.home,ALL=data.all.length?data.all:data.home;
  var SECS={frontier:{name:'学术前沿',sub:'AI 推动的科学发现和研究进展',side:'L'},practice:{name:'学术实践',sub:'老师和科研人员用 AI 的方法、工具和案例',side:'R'}};
  var mqMobile=window.matchMedia('(max-width:720px)');
  var PHRASES=['综述','访谈编码','Lean 证明','课堂规定','新酶','NotebookLM'];
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  var night=document.getElementById('night');
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches}
  function syncNight(){night.setAttribute('aria-label',isDark()?'切换到白天模式':'切换到熬夜模式');night.title=isDark()?'白天模式':'熬夜模式'}
  night.addEventListener('click',function(){var t=isDark()?'light':'dark';root.setAttribute('data-theme',t);try{localStorage.setItem('aihot-theme',JSON.stringify(t))}catch(e){}syncNight();drawSigs()});
  syncNight();

  function itemHTML(it,lead){return '<article class="sheet'+(lead?' lead':'')+'">'+
        (it.hook?'<div class="vb num"><b>'+it.hook+'</b><span>'+it.unit+'</span></div>':'')+
        '<h3 class="tab"><a href="'+it.url+'" target="_blank" rel="noopener" title="'+esc(it.sum)+'">'+esc(it.title)+'</a></h3>'+
        (it.name?'<div class="vc tname"><a href="'+it.url+'" target="_blank" rel="noopener" title="'+esc(it.title)+'">'+esc(it.name)+'</a></div><p class="vc tline">'+esc(it.line)+'</p>'
          :'<h3 class="vc"><a href="'+it.url+'" target="_blank" rel="noopener" title="'+esc(it.sum)+'">'+esc(it.title).replace(esc(it.mark),'<mark class="hl">'+esc(it.mark)+'</mark>')+'</a></h3><p class="vc take">'+esc(it.take)+'</p>')+
        '<button type="button" class="share-i" aria-label="存成分享图" title="存成分享图"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M4.8 5.2 8 2l3.2 3.2M3 9.5V13h10V9.5"/></svg></button><i class="vbc arr" aria-hidden="true">↗</i><p class="va">'+esc(it.sum)+'</p><p class="vb take">'+esc(it.take)+'</p>'+
        '<div class="meta va"><a href="'+it.url+'" target="_blank" rel="noopener" title="'+esc(it.host)+'">读原文 ↗</a></div></article>'}
  /* 版面：按行对齐。桌面上前沿第 i 条和实践第 i 条同一行 */
  var board=document.getElementById('board'),cards=[],heads=[];
  ['frontier','practice'].forEach(function(sec){
    var S=SECS[sec],list=ITEMS.filter(function(x){return x.sec===sec});
    var h=document.createElement('div');h.className='cell '+S.side+' '+sec;h.style.setProperty('--r',1);
    h.innerHTML='<div class="head" id="'+sec+'" style="flex:1"><h2><a href="#all-'+sec+'" title="全部'+S.name+'">'+S.name+'<i aria-hidden="true">→</i></a></h2><span>'+S.sub+'</span></div>';
    board.appendChild(h);heads.push(h);
    list.forEach(function(it,i){
      var c=document.createElement('div');c.className='cell '+S.side+' '+sec+(i>1?' row':'');c.style.setProperty('--r',i+2);
      c.innerHTML=itemHTML(it,i===0);
      board.appendChild(c);
      cards.push({el:c.querySelector('.sheet'),it:it,lead:i===0,order:ITEMS.indexOf(it)});
    });
    if(!list.length){var e0=document.createElement('div');e0.className='cell '+S.side+' '+sec;e0.style.setProperty('--r',2);e0.innerHTML='<p class="empty">AI 正在收录这一栏的内容，稍后再来看看。</p>';board.appendChild(e0)}
    var m=document.createElement('div');m.className='cell '+S.side+' '+sec+' more';m.style.setProperty('--r',list.length+2);
    m.style.setProperty('--r',Math.max(list.length,1)+2);
    m.innerHTML='<a class="more-link" href="#all-'+sec+'">全部'+S.name+'<i aria-hidden="true">→</i></a>';
    board.appendChild(m);
  });
  /* 条数不一样时，短的一栏补空行，让横线贯穿到底 */
  var nF=ITEMS.filter(function(x){return x.sec==='frontier'}).length,nP=ITEMS.length-nF;
  for(var r=Math.min(nF,nP);r<Math.max(nF,nP);r++){var f=document.createElement('div');var sec=nF>nP?'practice':'frontier';f.className='cell '+SECS[sec].side+' filler row';f.style.setProperty('--r',r+2);f.setAttribute('aria-hidden','true');board.appendChild(f)}
  cards.sort(function(a,b){return a.order-b.order});
  var pool=cards.concat(ALL.filter(function(it){return ITEMS.every(function(h){return h.id!==it.id})}).map(function(it){return {el:null,it:it}}));

  var q=document.getElementById('q');

  var ghostText=document.getElementById('ghostText'),field=document.getElementById('field');
  var pi=0,ci=PHRASES[0].length,dir=-1,hold=32;ghostText.textContent=PHRASES[0];
  var herProg=0,herKick=0;
  function tick(){
    if(field.classList.contains('typing')||field.classList.contains('filled')){setTimeout(tick,400);return}
    var s=PHRASES[pi];
    if(hold>0){hold--;setTimeout(tick,90);return}
    ci+=dir;
    if(ci>=s.length){ci=s.length;dir=-1;hold=26;glanceUntil=Date.now()+1300}
    if(ci<=0){ci=0;dir=1;pi=(pi+1)%PHRASES.length;hold=4}
    ghostText.textContent=PHRASES[pi].slice(0,ci);herProg=ci/PHRASES[pi].length;if(dir>0)herKick=Date.now();
    setTimeout(tick,dir>0?100+Math.random()*70:26);
  }
  if(!reduce)tick();

  var results=document.getElementById('results'),hits=[];
  function placeResults(){results.style.top=(field.offsetTop+field.offsetHeight+10)+'px'}
  function jump(c){results.hidden=true;if(!c.el){window.open(c.it.url,'_blank','noopener');return}c.el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});c.el.classList.remove('hit');void c.el.offsetWidth;c.el.classList.add('hit')}
  function search(){
    var v=q.value.trim();
    field.classList.toggle('filled',v.length>0);field.classList.remove('miss');
    if(!v){results.hidden=true;results.innerHTML='';hits=[];return}
    var terms=v.split(/[\s，,。、]+/).filter(Boolean).map(function(t){return t.toLowerCase()});
    function hay(c){return (c.it.title+c.it.sum+(c.it.name||'')+(c.it.line||'')+(c.it.take||'')+c.it.kw).toLowerCase()}
    hits=pool.filter(function(c){var h=hay(c);return terms.some(function(t){return h.indexOf(t)>=0})});
    if(!hits.length){ /* 整词没中：按两个字一组再比一次，只查字，不调 AI */
      var grams=[];terms.forEach(function(t){var cj=t.replace(/[^\u4e00-\u9fff]/g,'');for(var i=0;i+1<cj.length;i++)grams.push(cj.slice(i,i+2))});
      grams=grams.filter(function(g){return ['怎么','什么','如何','一下','可以','我想','哪些','这个','一个'].indexOf(g)<0});
      var scored=pool.map(function(c){var h=hay(c),n=0;grams.forEach(function(g){if(h.indexOf(g)>=0)n++});return {c:c,n:n}}).filter(function(x){return x.n>0});
      scored.sort(function(a,b){return b.n-a.n});hits=scored.map(function(x){return x.c});terms=terms.concat(grams);
    }
    placeResults();results.hidden=false;
    if(!hits.length){field.classList.add('miss');missUntil=Date.now()+2200;setTimeout(function(){field.classList.remove('miss')},2200);results.innerHTML='<div class="none">没找到。换个说法试试，比如「综述」「访谈」「证明」。</div>';return}
    results.innerHTML='';
    hits.slice(0,5).forEach(function(c){
      var b=document.createElement('button');b.type='button';
      var tt=esc(c.it.title);terms.forEach(function(t){var et=esc(t);var ix=tt.toLowerCase().indexOf(et);if(et&&ix>=0&&tt.indexOf('<mark')<0)tt=tt.slice(0,ix)+'<mark class="hl">'+tt.slice(ix,ix+et.length)+'</mark>'+tt.slice(ix+et.length)});
      b.innerHTML='<span class="dot" style="background:var(--'+(c.it.sec==='frontier'?'clay':'moss')+')"></span><span>'+tt+'</span>';
      b.addEventListener('click',function(){jump(c)});results.appendChild(b);
    });
    results.classList.remove('lit');requestAnimationFrame(function(){requestAnimationFrame(function(){results.classList.add('lit')})});
  }
  q.addEventListener('input',search);
  q.addEventListener('focus',function(){field.classList.add('typing')});
  q.addEventListener('blur',function(){field.classList.remove('typing')});
  q.addEventListener('keydown',function(e){
    if(e.key==='Escape'){q.value='';search();q.blur()}
    if(e.key==='Enter'){e.preventDefault();if(!q.value.trim()){q.value=PHRASES[pi];search()}if(hits.length)jump(hits[0])}
  });
  document.getElementById('go').addEventListener('click',function(){if(!q.value.trim()){q.value=PHRASES[pi];search()}if(hits.length)jump(hits[0]);else q.focus()});
  document.querySelector('.want').addEventListener('click',function(){if(!q.value){q.value=PHRASES[pi];search()}});
  document.addEventListener('click',function(e){if(!results.hidden&&!results.contains(e.target)&&e.target!==q&&!e.target.closest('.go-btn'))results.hidden=true});

  /* 眼镜：平滑跟随鼠标、偶尔眨眼；打字时低头，停下就恢复；搜不到时看向一边两秒 */
  var p1=document.getElementById('p1'),p2=document.getElementById('p2'),specs=document.getElementById('specs');
  var glanceUntil=0,tgt={x:0,y:0},cur={x:0,y:0},lastType=0,missUntil=0,blinkAt=Date.now()+2500,blinkT=0,mouse=null;
  function look(){} /* 兼容旧调用 */
  q.addEventListener('input',function(){lastType=Date.now()});
  q.addEventListener('keydown',function(){lastType=Date.now()});
  window.addEventListener('pointermove',function(e){if(e.pointerType==='mouse')mouse={x:e.clientX,y:e.clientY}},{passive:true});
  document.addEventListener('mouseleave',function(){mouse=null});
  function eyes(){
    var now=Date.now(),r=specs.getBoundingClientRect();
    if(r.width){
      if(now<missUntil){tgt.x=-1;tgt.y=-.5}
      else if(document.activeElement===q&&now-lastType<1400){tgt.x=0;tgt.y=1}
      else if(now<glanceUntil&&document.activeElement!==q){tgt.x=.35;tgt.y=1}
      else if(mouse){var dx=mouse.x-(r.left+r.width/2),dy=mouse.y-(r.top+r.height/2),d=Math.hypot(dx,dy)||1,k=Math.min(1,d/220);tgt.x=dx/d*k;tgt.y=dy/d*k}
      else{tgt.x=0;tgt.y=0}
      cur.x+=(tgt.x-cur.x)*.16;cur.y+=(tgt.y-cur.y)*.16;
      if(now>blinkAt){blinkT=now;blinkAt=now+2600+Math.random()*4200}
      var bl=now-blinkT<140?.12:1;
      var t='translate('+(cur.x*5.2).toFixed(2)+'px,'+(cur.y*4.6).toFixed(2)+'px) scale(1,'+bl+')';
      p1.style.transform=p2.style.transform=t;
    }
    requestAnimationFrame(eyes);
  }
  if(!reduce)requestAnimationFrame(eyes);


  /* 她的动作：马尾 = 表情（按主站规矩只在 -20…-70 之间）；笔跟着字动；纸上那道赭色随字写出来 */
  (function(){
    var her=document.getElementById('her');if(!her)return;
    function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
    function ponytail(seed){var r=rng(seed),bow=46+r()*13,kk=.62+r()*.14,len=.94+r()*.12,maxW=15+r()*2.6,taper=1.24+r()*.22,wob=.8+r()*1.1,ph=r()*Math.PI*2;
      var ax=-17,ay=-24,cx=-51*len,cy=85*len,chx=cx-ax,chy=cy-ay,chLen=Math.hypot(chx,chy)||1,cnx=-chy/chLen,cny=chx/chLen,radLen=Math.hypot(ax,ay)||1;
      var ex=(chx/chLen)*(1-kk)+(ax/radLen)*kk,ey=(chy/chLen)*(1-kk)+(ay/radLen)*kk,em=Math.hypot(ex,ey)||1;ex/=em;ey/=em;
      var b1x=ax+ex*chLen*.46,b1y=ay+ey*chLen*.46,b2x=ax+chx*.70+cnx*bow,b2y=ay+chy*.70+cny*bow,N=56,top=[],bot=[];
      for(var i=0;i<N;i++){var u=i/(N-1),v=1-u;
        var px=v*v*v*ax+3*u*v*v*b1x+3*u*u*v*b2x+u*u*u*cx,py=v*v*v*ay+3*u*v*v*b1y+3*u*u*v*b2y+u*u*u*cy;
        var tx=3*v*v*(b1x-ax)+6*u*v*(b2x-b1x)+3*u*u*(cx-b2x),ty=3*v*v*(b1y-ay)+6*u*v*(b2y-b1y)+3*u*u*(cy-b2y),m=Math.hypot(tx,ty)||1,nx=-ty/m,ny=tx/m;
        var w=maxW*Math.pow(v,taper);w+=Math.sin(u*5.7+ph)*wob*(4*u*v);w=Math.max(0,w);
        top.push((px+nx*w/2).toFixed(1)+' '+(py+ny*w/2).toFixed(1));bot.push((px-nx*w/2).toFixed(1)+' '+(py-ny*w/2).toFixed(1))}
      return 'M'+top.join('L')+'L'+bot.reverse().join('L')+'Z'}
    var tail=document.getElementById('herTail'),hand=document.getElementById('herHand'),ink=document.getElementById('herInk');
    tail.setAttribute('d',ponytail((Date.now()^(Math.random()*1e9))>>>0));
    var ang=-48,doneUntil=0,lastQ='';
    q.addEventListener('input',function(){herKick=Date.now()});
    function loop(){
      var now=Date.now(),target=-48;
      if(now<missUntil)target=-20;
      else if(now<doneUntil)target=-70;
      if(mouse){var r=her.getBoundingClientRect();var dx=(mouse.x-(r.left+r.width/2))/400;target+=Math.max(-1,Math.min(1,dx))*-8}
      target+=Math.sin(now/900)*1.6;
      target=Math.max(-70,Math.min(-20,target));
      ang+=(target-ang)*.08;
      tail.setAttribute('transform','rotate('+ang.toFixed(2)+')');
      var k=Math.max(0,1-(now-herKick)/180);
      hand.setAttribute('transform','translate('+(Math.sin(now/35)*1.4*k).toFixed(2)+' '+(Math.cos(now/28)*1.1*k).toFixed(2)+')');
      var prog=q.value?Math.min(1,q.value.length/8):herProg;
      ink.style.strokeDashoffset=(22*(1-prog)).toFixed(1);
      if(q.value&&q.value!==lastQ&&hits.length){doneUntil=now+1600}
      lastQ=q.value;
      requestAnimationFrame(loop);
    }
    if(!reduce)requestAnimationFrame(loop);else{tail.setAttribute('transform','rotate(-48)');ink.style.strokeDashoffset=0}
  })();
  /* 纸片落回两栏：飞行时是纸；落地后只有头条留作纸 */
  var pile=document.getElementById('pile'),hint=document.getElementById('pileHint');
  var geo=[],S=1;
  var JIT=[[0,-8,0],[64,-84,3],[-56,-56,-2.6],[46,56,3.4],[-36,100,-2.2],[72,120,1.8],[-62,138,2.6],[28,-120,-3.4],[-18,36,1.2]];
  function measure(){
    L&&L('重新测量布局');
    root.classList.remove('static');
    cards.forEach(function(c){c.el.style.transition='none';c.el.style.transform='none';c.el.classList.remove('flying')});
    requestAnimationFrame(function(){requestAnimationFrame(function(){cards.forEach(function(c){c.el.style.transition=''})})});
    heads.forEach(function(h){h.style.opacity=''});
    if(!cards.length||reduce||getComputedStyle(pile).display==='none'){
      if(!mqMobile.matches)root.classList.add('static');
      cards.forEach(function(c){c.el.style.transform=''});geo=[];return}
    var pr=pile.getBoundingClientRect(),sy=window.scrollY;
    var pcx=pr.left+pr.width/2,pcy=pr.top+sy+pr.height/2-20;
    var b=board.getBoundingClientRect();
    S=Math.max(240,b.top+sy-80);
    geo=cards.map(function(c,k){
      var r=c.el.getBoundingClientRect(),j=JIT[k%JIT.length];
      var s=Math.min(.84,(pr.width*.82)/r.width),jf=Math.min(1,pr.width/560);
      return {dx:pcx+j[0]*jf-(r.left+r.width/2),dy:pcy+j[1]*.85-(r.top+sy+r.height/2),rot:j[2],s:s,z:40+(cards.length-k)};
    });
    update();
  }
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  var ticking=false;
  function update(){
    ticking=false;if(!geo.length)return;
    var p=Math.min(1,Math.max(0,window.scrollY/S));
    hint.style.opacity=p>.04?0:1;
    var ho=Math.min(1,Math.max(0,(p-.5)/.3));heads.forEach(function(h){h.style.opacity=ho});
    cards.forEach(function(c,k){
      var g=geo[k];
      var t=Math.min(1,Math.max(0,(p-k*.02)/.62)),e=ease(t),ex=ease(Math.min(1,Math.max(0,(t-.3)/.7)));
      if(e>=1&&ex>=1){if(c.el.classList.contains('flying')||c.el.style.transform){c.el.style.transform='';c.el.style.zIndex='';c.el.classList.remove('flying')}return}
      c.el.classList.add('flying');c.el.style.zIndex=g.z;
      c.el.style.transform='translate('+(g.dx*(1-ex)).toFixed(1)+'px,'+(g.dy*(1-e)).toFixed(1)+'px) rotate('+(g.rot*(1-e)).toFixed(2)+'deg) scale('+(g.s+(1-g.s)*e).toFixed(3)+')';
    });
  }
  window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(measure,150)});

  if(!reduce&&mqMobile.matches&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.remove('enter');io.unobserve(en.target)}})},{rootMargin:'0px 0px -6% 0px'});
    cards.forEach(function(c){if(c.el.getBoundingClientRect().top<window.innerHeight)return;c.el.classList.add('enter');io.observe(c.el)});
  }
  var swF=document.getElementById('swF'),swP=document.getElementById('swP'),headP=document.getElementById('practice');
  window.addEventListener('scroll',function(){var inP=headP.getBoundingClientRect().top<window.innerHeight*.35;swP.classList.toggle('on',inP);swF.classList.toggle('on',!inP)},{passive:true});

  /* 打开页面时总是从顶部开始：不让浏览器或查看器「恢复上次滚动位置」替用户把纸片滚下去 */
  var touched=false,t0=Date.now();
  ['wheel','touchstart','keydown','pointerdown'].forEach(function(ev){window.addEventListener(ev,function(){touched=true},{passive:true,once:true})});
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}
  if(!location.hash||location.hash==='#about'){root.style.scrollBehavior='auto';window.scrollTo(0,0)}
  window.addEventListener('scroll',function(){if(!touched&&!location.hash&&Date.now()-t0<2500&&window.scrollY>0){window.scrollTo(0,0)}},{passive:true});
  setTimeout(function(){root.style.scrollBehavior=''},2600);

  function L(){}

  /* 随手翻一张：点纸或按钮翻开；再点，这张滑到一边，下一张从纸堆里翻开 */
  var deck=document.getElementById('deck'),card=document.getElementById('card3d'),front=document.getElementById('front'),flipBtn=document.getElementById('flipBtn'),lastPick=-1,busy=false;
  var curItem=null;
  function markTitle(it){return it.mark?esc(it.title).replace(esc(it.mark),'<mark class="hl">'+esc(it.mark)+'</mark>'):esc(it.title)}
  function fillFront(){
    var i;do{i=Math.floor(Math.random()*ALL.length)}while(ALL.length>1&&i===lastPick);lastPick=i;
    var it=ALL[i];front.className='face front '+it.sec;
    front.classList.remove('lit');curItem=it;
    front.innerHTML='<div class="sec">'+SECS[it.sec].name+'</div>'+
      (it.name?'<div class="tname">'+esc(it.name)+'</div><p class="tline">'+esc(it.line)+'</p>'
        :'<h3>'+markTitle(it)+'</h3><p class="take">'+esc(it.take)+'</p>')+
      '<div class="row2"><a href="'+it.url+'" target="_blank" rel="noopener" title="'+esc(it.host)+'">读原文 ↗</a><button type="button" class="share-f">存成图片</button></div>';
    setTimeout(function(){front.classList.add('lit')},260);
  }
  var inner=card.querySelector('.inner');
  function showFront(){fillFront();card.classList.add('flipped');card.setAttribute('aria-label','再翻一张');flipBtn.textContent='再翻一张'}
  /* 翻面用「压扁再展开」：纸收窄到一条线的瞬间换面，任何时候都看不到反着的字 */
  function draw(){
    if(busy||!ALL.length)return;
    if(!card.classList.contains('flipped')){
      if(reduce){showFront();return}
      busy=true;card.style.transform='';
      inner.style.transition='transform .17s cubic-bezier(.5,0,.9,.4)';inner.classList.add('squash');
      setTimeout(function(){showFront();inner.style.transition='transform .34s cubic-bezier(.2,1.45,.45,1)';inner.classList.remove('squash');
        setTimeout(function(){busy=false},340)},170);
      return;
    }
    if(reduce){fillFront();return}
    busy=true;card.classList.add('out');
    setTimeout(function(){
      fillFront();card.classList.remove('out');card.classList.add('in');
      void card.offsetWidth;
      requestAnimationFrame(function(){card.classList.remove('in');setTimeout(function(){busy=false},300)});
    },360);
  }
  flipBtn.addEventListener('click',draw);
  card.addEventListener('click',function(e){if(e.target.closest('a'))return;if(e.target.closest('.share-f')){e.stopPropagation();shareCard(curItem);return}draw()});
  card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();draw()}});
  /* 鼠标在纸上移动时，纸跟着手微微倾斜 */
  deck.addEventListener('pointermove',function(e){
    if(reduce||e.pointerType!=='mouse'||busy)return;
    var r=deck.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    card.style.transform='rotateX('+(-y*6).toFixed(2)+'deg) rotateY('+(x*7).toFixed(2)+'deg) translateY(-3px)';
  });
  deck.addEventListener('pointerleave',function(){card.style.transform=''});


  /* 分享图：1080×1440 竖版，纸底 + 标题（带笔触）+ 要点 + 底部陶土色落款 */
  var shot=document.createElement('div');shot.className='shot';shot.hidden=true;
  shot.innerHTML='<img alt="分享图"><p>右键或长按图片保存</p><button type="button">关闭</button>';
  document.body.appendChild(shot);
  shot.addEventListener('click',function(e){if(e.target.tagName!=='IMG')shot.hidden=true});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')shot.hidden=true});
  function tokens(str){return str.match(/[A-Za-z0-9%.\-+]+|\s|./g)||[]}
  function layout(ctx,str,maxW,markStr){ /* 返回 [{t,x,line,idx}]，按词换行，中文逐字；划重点的短语不拆开 */
    var mi=markStr?str.indexOf(markStr):-1,tk=mi<0?tokens(str):tokens(str.slice(0,mi)).concat([markStr],tokens(str.slice(mi+markStr.length))),out=[],x=0,line=0,idx=0;
    tk.forEach(function(t){var w=ctx.measureText(t).width;if(x+w>maxW&&x>0&&t!==' '&&!/^[，。、；：？！」』）》,.;:!?)]$/.test(t)){x=0;line++}if(!(x===0&&t===' ')){out.push({t:t,x:x,line:line,idx:idx,w:w});x+=w}idx+=t.length});
    return out;
  }
  function shareCard(it){
    if(!it)return;
    var sc=2,W=1080,H=1440,cv=document.createElement('canvas');cv.width=W;cv.height=H;var c=cv.getContext('2d');
    var ink='#1f1e1c',muted='#6a655d',secC=it.sec==='frontier'?'#bf502b':'#3f6f5e',pad=96,maxW=W-pad*2;
    var SERIF='"Noto Serif SC","Songti SC",serif',SANS='"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
    c.fillStyle='#faf9f5';c.fillRect(0,0,W,H);
    c.textBaseline='alphabetic';
    c.fillStyle=secC;c.font='500 32px '+SANS;
    var lab=SECS[it.sec].name.split('').join(String.fromCharCode(8202)+' ');c.fillText(lab,pad,pad+40);
    var y=0,dry=true;
    function para(str,font,color,lh,markStr){
      c.font=font;var L=layout(c,str,maxW,markStr),lines=0;L.forEach(function(o){lines=Math.max(lines,o.line)});
      if(dry){y+=(lines+1)*lh;return}
      if(markStr){var mi=str.indexOf(markStr),me=mi+markStr.length,seg={};
        L.forEach(function(o){if(o.idx>=mi&&o.idx<me){var g=seg[o.line]||(seg[o.line]={a:o.x,b:o.x+o.w});g.a=Math.min(g.a,o.x);g.b=Math.max(g.b,o.x+o.w)}});
        Object.keys(seg).forEach(function(k){var g=seg[k],bw=g.b-g.a+16,bh=Math.round(lh*.34),t=document.createElement('canvas');t.width=Math.round(bw);t.height=bh;
          drawStroke(t,7+ +k,1,'rgba(217,119,87,.5)');c.drawImage(t,pad+g.a-8,y+k*lh+lh*.12-bh*.35)});
      }
      c.fillStyle=color;L.forEach(function(o){c.fillText(o.t,pad+o.x,y+o.line*lh)});
      y+=(lines+1)*lh;
    }
    function body(){if(it.name){para(it.name,'600 108px '+SERIF,secC,136);y+=14;para(it.title,'600 44px '+SERIF,ink,68);y+=36;para(it.line,'400 38px '+SANS,muted,64)}
    else{para(it.title,'600 74px '+SERIF,ink,112,it.mark);y+=40;para(it.take,'400 40px '+SANS,muted,68)}}
    body();var hgt=y,top=pad+90,room=H-250-top;dry=false;y=top+Math.max(0,(room-hgt)/2)+60;body();
    /* 底部落款：陶土色色块 */
    var bandH=250;c.fillStyle='#d97757';c.fillRect(0,H-bandH,W,bandH);
    c.fillStyle=ink;c.font='200 64px '+SERIF;var sig='广艺';var sx=pad,sy=H-bandH+118;
    sig.split('').forEach(function(ch,i){c.fillText(ch,sx+i*(64*1.16),sy)});
    var st=document.createElement('canvas');st.width=150;st.height=12;drawStroke(st,sigSeed,1,'#1f1e1c');c.drawImage(st,sx-4,sy+14);
    c.fillStyle='rgba(31,30,28,.35)';c.fillRect(sx+168,sy-50,2,56);
    c.fillStyle=ink;c.font='600 44px '+SERIF;c.fillText('AI 学术站',sx+196,sy);
    c.font='400 30px '+SANS;c.fillStyle='#2a2622';c.fillText('sci.guangyi.me',sx,H-bandH+196);
    c.textAlign='right';c.fillText('从设计到代码，我和 AI 一起做的',W-pad,H-bandH+196);c.textAlign='left';
    try{shot.querySelector('img').src=cv.toDataURL('image/png');shot.hidden=false}catch(e){}
  }
  board.addEventListener('click',function(e){var b=e.target.closest('.share-i');if(!b)return;e.preventDefault();e.stopPropagation();
    var el=b.closest('.sheet');cards.forEach(function(c){if(c.el===el)shareCard(c.it)})});
  /* 「关于」是同一页里的另一个视图：链接 #about 打开，其他任何位置回到首页 */
  var navAbout=document.getElementById('navAbout');
  var listPage=document.getElementById('listPage'),llist=document.getElementById('llist'),lq=document.getElementById('lq'),listSec=null;
  function renderList(){
    var v=lq.value.trim().toLowerCase(),terms=v.split(/[\s，,。、]+/).filter(Boolean);
    var list=ALL.filter(function(x){return x.sec===listSec}).filter(function(x){if(!terms.length)return true;var hay=(x.title+x.sum+(x.name||'')+(x.line||'')+(x.take||'')+x.kw).toLowerCase();return terms.some(function(t){return hay.indexOf(t)>=0})});
    llist.innerHTML=list.length?list.map(function(it){return '<div class="item">'+itemHTML(it,false)+'</div>'}).join(''):'<div class="none">这一栏里没找到。换个说法试试。</div>';
    requestAnimationFrame(function(){requestAnimationFrame(function(){llist.querySelectorAll('.sheet').forEach(function(e){e.classList.add('lit')})})});
  }
  lq.addEventListener('input',renderList);
  llist.addEventListener('click',function(e){var b=e.target.closest('.share-i');if(!b)return;e.preventDefault();e.stopPropagation();var t=b.closest('.sheet').querySelector('a').getAttribute('href');ALL.forEach(function(it){if(it.url===t)shareCard(it)})});
  function route(first){
    var about=location.hash==='#about',m=location.hash.match(/^#all-(frontier|practice)$/);
    root.classList.toggle('page-about',about);navAbout.classList.toggle('on',about);
    root.classList.toggle('page-list',!!m);
    document.getElementById('navF').classList.toggle('on',!!m&&m[1]==='frontier');document.getElementById('navP').classList.toggle('on',!!m&&m[1]==='practice');
    if(m){listSec=m[1];listPage.className='listpage '+listSec;document.getElementById('listTitle').textContent=SECS[listSec].name;document.getElementById('listSub').textContent=SECS[listSec].sub;lq.value='';lq.placeholder='在'+SECS[listSec].name+'里搜';renderList();window.scrollTo(0,0);return}
    if(about){window.scrollTo(0,0)}
    else if(!first){setTimeout(function(){measure();if(!location.hash||location.hash==='#top'){window.scrollTo(0,0);return}var t=document.getElementById(location.hash.slice(1));if(t)t.scrollIntoView({block:'start'})},30)}
  }
  window.addEventListener('hashchange',function(){route(false)});
  route(true);

  root.classList.add('ver-c');
  if(!ALL.length){var fsec=document.querySelector('.flip');if(fsec)fsec.style.display='none'}
  /* 划重点：条目进入视野时，笔触从左往右刷出来 */
  function lightUp(){var hh=innerHeight*.88;cards.forEach(function(c){if(c.lit)return;var r=c.el.getBoundingClientRect();if(r.top<hh&&r.bottom>0){c.lit=true;c.el.classList.add('lit')}})}
  if(reduce)cards.forEach(function(c){c.el.classList.add('lit')});
  else{window.addEventListener('scroll',lightUp,{passive:true});setInterval(lightUp,700);}
  if(!ITEMS.length)root.classList.add('sci-empty');
  measure();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){measure();drawSigs()});
}
