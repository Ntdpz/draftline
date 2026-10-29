(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const canvas = $('#flow-canvas');
  if (!canvas) return;
  const D=window.Draftline;
  const colors = { peach: '#f7dfc8', lilac: '#e7ddf6', blue: '#d9eafa', green: '#e0ead5', yellow: '#f6edb7' };
  const palette = Object.keys(colors);
  const copy = value => JSON.parse(JSON.stringify(value));
  const uid = () => window.crypto?.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  const initial = {
    id: null, title: 'First idea', style: 'sketch',
    nodes: [
      {id:'n1',label:'New idea',x:65,y:150,w:130,h:68,color:'peach',shape:'start'},
      {id:'n2',label:'Map the steps',x:285,y:150,w:175,h:68,color:'lilac',shape:'step'},
      {id:'n3',label:'Review together',x:565,y:66,w:180,h:68,color:'blue',shape:'step'},
      {id:'n4',label:'Find the gaps',x:565,y:238,w:180,h:68,color:'peach',shape:'step'},
      {id:'n5',label:'Ready to build',x:865,y:150,w:180,h:68,color:'green',shape:'step'},
    ],
    edges:[{from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n2',to:'n4'},{from:'n3',to:'n5'},{from:'n4',to:'n5'}]
  };
  let state = copy(initial), history = [], selected = null, editColor = 'lilac', presentStep = 0, toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message; el.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3300);
  }
  function validateModel(value) { return D.validateModel(value); }
  function readDrafts() { return D.readDrafts(); }
  function rememberCurrent() { D.remember(state); }
  function checkpoint(model = state) { history.push(copy(model)); if (history.length > 30) history.shift(); }
  function commit(mutation) { checkpoint(); mutation(); render(); rememberCurrent(); }
  function lines(text, max = 18) {
    const words = text.split(/\s+/), result = [''];
    for (const word of words) {
      const index = result.length - 1;
      if ((result[index] + ' ' + word).trim().length > max && result[index] && result.length < 3) result.push(word);
      else result[index] += (result[index] ? ' ' : '') + word;
    }
    return result.map(line => line.length > 21 ? line.slice(0,20) + '…' : line);
  }
  function shapeMarkup(node) {
    const {w,h} = node;
    const props = `class="node-outline" fill="${colors[node.color]}" stroke="#292723" stroke-width="1.7"`;
    if (node.shape === 'decision') return `<path ${props} d="M${w/2} 0 L${w} ${h/2} L${w/2} ${h} L0 ${h/2}Z"/>`;
    if (node.shape === 'start') return `<rect ${props} x="1" y="1" width="${w-2}" height="${h-2}" rx="${h/2}"/>`;
    if (state.style === 'clean') return `<rect ${props} x="1" y="1" width="${w-2}" height="${h-2}" rx="8"/>`;
    return `<path ${props} stroke-linejoin="round" d="M8 2 Q${w*.45} -1 ${w-7} 3 Q${w+1} 4 ${w-1} 13 L${w-2} ${h-9} Q${w-2} ${h+1} ${w-13} ${h-1} L9 ${h-2} Q0 ${h-2} 2 ${h-12} L1 10 Q1 1 8 2Z"/>`;
  }
  function edgeMarkup() { return D.edgeMarkup(state,"flow-arrow"); }
  function render() {
    canvas.classList.toggle('clean', state.style === 'clean');
    canvas.innerHTML = D.sceneMarkup(state,{interactive:true,selected});
    $$('.flow-node',canvas).forEach(group => {
      group.addEventListener('pointerdown', startDrag);
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); openEditor(group.dataset.id);}
      });
    });
    $$('[data-node-count]').forEach(el => el.textContent=`${state.nodes.length} steps · ${state.edges.length} connections`);
    $$('.project-name').forEach(el => {el.textContent=state.title+' ⌄';});
    $$('[data-style]').forEach(button => {const active=button.dataset.style===state.style;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    $$('[data-action="undo"]').forEach(button => button.disabled=!history.length);
  }
  function startDrag(event) {
    if (event.button !== 0) return;
    const group=event.currentTarget, node=state.nodes.find(n => n.id===group.dataset.id);
    const matrix=canvas.getScreenCTM();
    if (!matrix || !node) return;
    event.preventDefault();
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const origin={x:node.x,y:node.y}, before=copy(state);let moved=false;
    group.setPointerCapture(event.pointerId);
    const move = e => {
      const next=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
      const dx=next.x-point.x,dy=next.y-point.y;
      if (Math.hypot(dx,dy)>4) moved=true;
      if (!moved) return;
      node.x=Math.max(10,Math.min(1090-node.w,origin.x+dx));node.y=Math.max(15,Math.min(360-node.h,origin.y+dy));
      group.setAttribute('transform',`translate(${node.x} ${node.y})`);$('.edges',canvas).innerHTML=edgeMarkup();
    };
    const finish = () => {
      group.removeEventListener('pointermove',move);group.removeEventListener('pointerup',finish);group.removeEventListener('pointercancel',cancel);
      if (moved) {checkpoint(before);selected=node.id;render();rememberCurrent();} else openEditor(node.id);
    };
    const cancel = () => {state=before;render();};
    group.addEventListener('pointermove',move);group.addEventListener('pointerup',finish,{once:true});group.addEventListener('pointercancel',cancel,{once:true});
  }
  function openEditor(id) {
    const node=state.nodes.find(n=>n.id===id);if(!node)return;
    selected=id;editColor=node.color;
    $('#step-name').value=node.label;$('#step-shape').value=node.shape;
    $$('.swatch').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===editColor)));
    $('#edit-dialog').showModal();$('#step-name').focus();$('#step-name').select();
  }
  function linearScene(labels,title) { return D.linearScene(labels,title,state.style); }
  const templates=D.templates;
  function useTemplate(name,notify=true) {
    const template=Object.hasOwn(templates,name)?templates[name]:null;if(!template)return;
    commit(()=>{state=D.templateModel(name,state.style);selected=null;});
    $('#outline').value=template.steps.join(' → ');
    $('#outline-hint').classList.remove('error');
    $('#outline-hint').textContent='A beginning to borrow. Click a step to edit it, or drag it somewhere new.';
    if(notify)toast('A beginning to borrow. Click any step to make it yours.');
  }
  $('#outline-form').addEventListener('submit',event=>{
    event.preventDefault();
    const raw=$('#outline').value.trim();
    const labels=raw.split(/\s*(?:->|→|\n|\|)\s*/u).map(x=>x.trim()).filter(Boolean);
    const hint=$('#outline-hint');
    if(labels.length<2||labels.length>8||labels.some(x=>x.length>42)) {
      hint.textContent='Use 2–8 steps with arrows (→ or ->), and keep each step under 43 characters.';hint.classList.add('error');$('#outline').focus();return;
    }
    commit(()=>{state=linearScene(labels,'A new thought');selected=null;});
    hint.classList.remove('error');hint.textContent='There it is. Click a step to edit it, or drag it somewhere new.';
    toast('A rough outline, a clearer path.');
  });
  $('#edit-form').addEventListener('submit',event=>{
    event.preventDefault();const label=$('#step-name').value.trim();if(!label)return;
    commit(()=>{const node=state.nodes.find(n=>n.id===selected);if(node){node.label=label;node.color=editColor;node.shape=$('#step-shape').value;node.h=node.shape==='decision'?90:68;}});
    $('#edit-dialog').close();toast('A little clearer.');
  });
  $$('.swatch').forEach(button=>button.addEventListener('click',()=>{editColor=button.dataset.color;$$('.swatch').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  $('#rename-form').addEventListener('submit',event=>{event.preventDefault();const title=$('#draft-name').value.trim();if(!title)return;commit(()=>{state.title=title;});$('#rename-dialog').close();toast('A good thought deserves a name.');});
  function addStep(shape='step') {
    if(state.nodes.length>=8){toast('A little room for up to 8 steps. Edit an existing step to keep things clear.');return;}
    const label=shape==='decision'?'What happens next?':'A new step';
    commit(()=>{
      const labels=state.nodes.map(n=>n.label), previous=copy(state.nodes), title=state.title, id=state.id;
      state=linearScene([...labels,label],title);state.id=id;
      state.nodes.forEach((n,i)=>{if(previous[i]){n.color=previous[i].color;n.shape=previous[i].shape;}else n.shape=shape;});
      state.nodes[state.nodes.length-1].h=shape==='decision'?90:68;
    });
    openEditor(state.nodes[state.nodes.length-1].id);
  }
  function saveDraft() {
    try {
      const collectionId=new URLSearchParams(location.search).get("collection");
      const item=D.saveModel(state,{collectionId:collectionId&&D.collections().some(c=>c.id===collectionId)?collectionId:null});
      state.id=item.model.id;rememberCurrent();render();toast("A thought for later. Saved in this browser.");return item;
    } catch(error) { toast(error.message);return null; }
  }
  function showDrafts() { location.href="workspace.php"; }
  async function exportSvg() {
    try { const markup=await D.exportSvg(state,"paper");D.download(new Blob([markup],{type:"image/svg+xml;charset=utf-8"}),D.filename(state.title)+".svg");toast("The whole picture, ready to take with you."); }
    catch(error){toast(error.message||"This flow could not be exported.");}
  }
  function drawPresentation() {
    const node=state.nodes[presentStep];$('#present-label').textContent=node.label;$('#present-card').style.backgroundColor=colors[node.color];$('#present-count').textContent=`STEP ${String(presentStep+1).padStart(2,'0')} OF ${String(state.nodes.length).padStart(2,'0')}`;
    $('#present-prev').disabled=presentStep===0;$('#present-next').textContent=presentStep===state.nodes.length-1?'Back to the canvas ↗':'Next step →';
    $('#present-dots').innerHTML=state.nodes.map((_,i)=>`<i class="${i===presentStep?'active':''}"></i>`).join('');
  }
  function present() {const saved=saveDraft();if(saved)location.href='present.php?id='+encodeURIComponent(saved.model.id);}
  $('#present-prev').addEventListener('click',()=>{if(presentStep>0){presentStep--;drawPresentation();}});
  $('#present-next').addEventListener('click',()=>{if(presentStep<state.nodes.length-1){presentStep++;drawPresentation();}else $('#present-dialog').close();});
  const infos={
    guide:{title:'Start small. See it clearly.',content:'<ol><li><strong>Write an outline.</strong> Separate 2–8 short steps with arrows, like “Arrive → Explore → A first win”. Press Build flow.</li><li><strong>Make it yours.</strong> Click a step to change its name, shape, or color. Drag it to give your idea a little room.</li><li><strong>Keep the thought.</strong> Save a draft in this browser, present a walkthrough, or export an SVG.</li></ol><p>Draftline connects the steps you write. It does not call an AI service or invent a journey for you.</p>'},
    shortcuts:{title:'A few useful little keys.',content:'<ul><li><kbd>Tab</kbd> moves between tools and steps.</li><li><kbd>Enter</kbd> or <kbd>Space</kbd> opens a focused step for editing.</li><li><kbd>Ctrl / Cmd</kbd> + <kbd>S</kbd> saves a draft.</li><li><kbd>Ctrl / Cmd</kbd> + <kbd>Z</kbd> undoes a canvas edit.</li><li><kbd>←</kbd> and <kbd>→</kbd> move through a presentation.</li><li><kbd>Esc</kbd> closes any dialog.</li></ul>'},
    privacy:{title:'Your thoughts stay yours.',content:'<p>Your flow is kept in this browser. Draftline does not send outlines, draft names, or diagrams to a server.</p><p>Saved drafts use local storage on this device. Your current canvas also uses temporary browser session storage. There are no accounts, trackers, analytics, or third-party network requests.</p><p>Exporting creates an SVG download on your device. Sharing that file is up to you.</p>'},
    storage:{title:'Keep a thought for later.',content:'<p>Press <strong>Save draft</strong> to keep the current flow in this browser. Open <strong>Your drafts</strong> to come back to it. Rename a flow by clicking its name above the canvas.</p><p>These drafts do not sync between browsers or devices. Clearing site data, using a temporary browsing session, or removing a draft can erase it. Export an SVG if you want a separate copy.</p>'},
    about:{title:'For the unfinished idea.',content:'<p>Draftline is an original prototype for developers, product teams, and anyone trying to make a user journey a little clearer.</p><p>The brand, words, and sample flows were created for this project. The design began on a Pencil canvas and became this small PHP and JavaScript application.</p><p>This prototype works locally. It has no sign-up, paid plan, AI backend, or collaboration server.</p>'}
  };
  function showInfo(key){const info=infos[key]||infos.guide;$('#info-title').textContent=info.title;$('#info-content').innerHTML=info.content;$('#info-dialog').showModal();}
  const actions={
    select:()=>toast('Click a step to edit it. Drag to find a little more room.'),
    add:()=>addStep(), decision:()=>addStep('decision'),
    undo:()=>{if(history.length){state=history.pop();selected=null;render();rememberCurrent();toast('One thought back.');}},
    save:saveDraft,drafts:showDrafts,export:exportSvg,present,
    rename:()=>{$('#draft-name').value=state.title;$('#rename-dialog').showModal();$('#draft-name').select();},
    reset:()=>{commit(()=>{state=copy(initial);selected=null;});$('#outline').value='';$('#outline-hint').textContent='Use arrows (→ or ->) between 2–8 steps. Everything stays on this device.';$('#outline-hint').classList.remove('error');toast('A fresh little starting point.');},
    remove:()=>{
      if(state.nodes.length<2){toast('Leave one little starting point on the canvas.');return;}
      commit(()=>{const incoming=state.edges.filter(e=>e.to===selected),outgoing=state.edges.filter(e=>e.from===selected);state.nodes=state.nodes.filter(n=>n.id!==selected);state.edges=state.edges.filter(e=>e.from!==selected&&e.to!==selected);for(const a of incoming)for(const b of outgoing)if(a.from!==b.to&&!state.edges.some(e=>e.from===a.from&&e.to===b.to))state.edges.push({from:a.from,to:b.to});selected=null;});$('#edit-dialog').close();toast('A little simpler.');
    }
  };
  $$('[data-action]').forEach(button=>button.addEventListener('click',()=>actions[button.dataset.action]?.()));
  $$('[data-style]').forEach(button=>button.addEventListener('click',()=>{if(state.style!==button.dataset.style)commit(()=>{state.style=button.dataset.style;});}));
  $$('[data-template]').forEach(button=>button.addEventListener('click',()=>useTemplate(button.dataset.template)));
  $$('[data-info]').forEach(button=>button.addEventListener('click',()=>showInfo(button.dataset.info)));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
  $$('[data-feature]').forEach(button=>button.addEventListener('click',()=>{
    const type=button.dataset.feature;
    if(type==='drafts'){showDrafts();return;} if(type==='templates'){location.href='templates.php';return;}
    $('#demo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    if(type==='outline')$('#outline').focus({preventScroll:true});
    if(type==='style'){commit(()=>{state.style=state.style==='sketch'?'clean':'sketch';});toast(`A little ${state.style==='clean'?'more precise':'more playful'}.`);}
    if(type==='edit')openEditor(state.nodes[1]?.id||state.nodes[0].id);
    if(type==='present')present(); if(type==='export')exportSvg();
  }));
  const menuButton=$('.mobile-menu-toggle');
  if(menuButton){menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-nav').hidden=!open;});$$('a,button',$('#mobile-nav')).forEach(el=>el.addEventListener('click',()=>{$('#mobile-nav').hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');}));}
  document.addEventListener('keydown',event=>{
    const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
    if($('#present-dialog').open&&!editing){if(event.key==='ArrowRight')$('#present-next').click();if(event.key==='ArrowLeft')$('#present-prev').click();}
    if((event.ctrlKey||event.metaKey)&&!editing&&!$('dialog[open]')){if(event.key.toLowerCase()==='s'){event.preventDefault();saveDraft();}if(event.key.toLowerCase()==='z'){event.preventDefault();actions.undo();}}
    if(event.key==='Escape'&&menuButton){$('#mobile-nav').hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');}
  });
  const routeParams=new URLSearchParams(location.search);
  const requested=routeParams.get("id"),template=routeParams.get("template");
  const saved=requested?D.getDraft(requested):null;
  if(requested&&saved)state=copy(saved.model);
  else if(requested&&!saved){state=D.newModel();D.toast("This draft is no longer available. Check Trash, or start a new flow.");}
  else if(routeParams.get("new")==="1")state=D.newModel();
  else if(Object.hasOwn(templates,template))state=D.templateModel(template);
  else{const current=D.current();if(current&&(!current.id||D.getDraft(current.id)))state=current;}
  if(Object.hasOwn(templates,template))$("#outline").value=templates[template].steps.join(" → ");
  function applyGrid(){document.querySelector(".canvas-paper")?.classList.toggle("hide-grid",!D.preferences().grid);}
  D.editor={getModel:()=>copy(state),save:saveDraft};
  document.querySelectorAll("[data-editor-route]").forEach(button=>button.addEventListener("click",()=>{const item=saveDraft();if(item)location.href=button.dataset.editorRoute+".php?id="+encodeURIComponent(item.model.id);}));
  applyGrid();render();rememberCurrent();document.fonts.ready.then(render);
})();
