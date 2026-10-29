(() => {
  'use strict';
  const D=window.Draftline;if(!D)return;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const e=D.escape,params=new URLSearchParams(location.search),page=document.body.dataset.page;
  const paths={
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
    folder:'<path d="M3 6h7l2 3h9v12H3Z"/>',plus:'<path d="M12 4v16M4 12h16"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    play:'<path d="m8 4 13 8-13 8Z"/>',history:'<path d="M3 4v6h6M3 10a9 9 0 1 1 1 8M12 7v5l3 2"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a1 1 0 0 1 0-2h3a6 6 0 0 0 0-12Z"/><path d="M7 8h.1M12 6h.1M17 8h.1M6 13h.1"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    shield:'<path d="M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m7 12 3 3 7-7"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    restore:'<path d="M3 4v6h6M3 10a9 9 0 1 1 1 8"/>'
  };
  function icon(name){return '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.arrow)+'</svg>';}
  function url(route,id,extra={}){const q=new URLSearchParams(extra);if(id)q.set('id',id);return route+'.php'+(q.size?'?'+q:'');}
  function button(text,cmd,attrs='',light=false){return '<button type="button" class="button '+(light?'button-outline':'')+'" data-cmd="'+cmd+'" '+attrs+'>'+text+'</button>';}
  function link(text,href,light=false,cls='button'){return '<a class="'+cls+(light?' button-outline':'')+'" href="'+e(href)+'">'+text+'</a>';}
  function heading(eyebrow,title,copy,actions=''){return '<section class="page-hero"><span class="eyebrow">'+e(eyebrow)+'</span><h1 tabindex="-1">'+e(title)+'</h1>'+(copy?'<p>'+e(copy)+'</p>':'')+(actions?'<div class="hero-actions">'+actions+'</div>':'')+'</section>';}
  function diagram(model,cls='',grid=D.preferences().grid,options={}){return '<div class="flow-thumb '+(grid?'has-grid ':'')+cls+'">'+D.svg(model,options)+'</div>';}
  function tag(text,cls=''){return '<span class="tag '+cls+'">'+e(text)+'</span>';}
  function searchBox(placeholder,kind,value){return '<label class="search-box">'+icon('search')+'<span class="sr-only">'+e(placeholder)+'</span><input type="search" data-filter="'+kind+'" value="'+e(value)+'" placeholder="'+e(placeholder)+'" autocomplete="off"></label>';}
  function empty(title,copy,actions='',compact=false){return '<section class="empty-state '+(compact?'compact':'')+'">'+icon('folder')+'<h2>'+e(title)+'</h2><p>'+e(copy)+'</p>'+(actions?'<div class="action-row">'+actions+'</div>':'')+'</section>';}
  function collectionName(id){return D.collections().find(c=>c.id===id)?.name||'No collection';}
  function collectionOptions(selected){return '<option value="">No collection</option>'+D.collections().map(c=>'<option value="'+e(c.id)+'" '+(c.id===selected?'selected':'')+'>'+e(c.name)+'</option>').join('');}
  const state={
    search:'',view:D.preferences().view,category:params.get('category')||'All',collection:params.get('id'),
    selectedVersion:params.get('version'),compare:true,step:0,notesVisible:true,
    exportFormat:'png',background:'paper',scale:2,zoom:1,exportName:null,
    tags:[],pendingBackup:null,pendingName:'',draftPrefs:D.preferences(),preferenceDirty:false
  };
  function resolveEntry(){
    const explicit=params.get('id');
    if(explicit)return D.getDraft(explicit);
    const current=D.current();
    return (current?.id?D.getDraft(current.id):null)||D.activeDrafts()[0]||null;
  }
  function unavailable(title='A little thought is missing.'){
    return heading('MY WORKSPACE',title,'This flow may have moved to Trash, or it may not be saved in this browser.')+
      empty('Find your next starting point.','Choose a saved flow, restore one from Trash, or create something new.',link('My Workspace','workspace.php')+link('Open Trash','trash.php',true)+link('New flow','canvas.php?new=1',true));
  }
  let dialogReturnFocus=null;
  D.dialog = ({title,eyebrow='MAKE IT YOURS',fields='',submit='Save',onSubmit,wide=false}) => {
    let dialog=$('#action-dialog');
    if(!dialog){
      dialog=document.createElement('dialog');dialog.id='action-dialog';dialog.className='small-dialog';
      dialog.setAttribute('aria-labelledby','action-title');
      dialog.innerHTML='<div class="dialog-heading"><span class="eyebrow" id="action-eyebrow"></span><button class="icon-button" data-dismiss-dialog aria-label="Close dialog">'+icon('close')+'</button></div><h2 id="action-title"></h2><form id="action-form"><div id="action-fields"></div><p id="action-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-outline" data-dismiss-dialog>Cancel</button><button type="submit" class="button" id="action-submit"></button></div></form>';document.body.append(dialog);
    }
    dialogReturnFocus=document.activeElement?.closest('details')?.querySelector('summary')||document.activeElement;
    $$('details[open]').forEach(details=>details.open=false);
    $('#action-title').textContent=title;$('#action-eyebrow').textContent=eyebrow;$('#action-fields').innerHTML=fields;
    $('#action-error').textContent='';$('#action-submit').textContent=submit;$('#action-submit').disabled=false;
    dialog.classList.toggle('wide-dialog',!!wide);
    $('#action-form').onsubmit=async event=>{
      event.preventDefault();const submitButton=$('#action-submit');submitButton.disabled=true;
      try{await onSubmit(new FormData(event.currentTarget));dialog.close();}
      catch(error){$('#action-error').textContent=error.message||'The change could not be saved.';}
      finally{submitButton.disabled=false;}
    };
    dialog.onclose=()=>{if(dialogReturnFocus?.isConnected)dialogReturnFocus.focus();};
    dialog.showModal();
    const input=$('input,textarea,select',dialog);if(input){input.focus();if(input.select&&input.type!=='checkbox')input.select();}
  };
  D.confirm = (title,copy,submit,onSubmit) => D.dialog({title,eyebrow:'A MOMENT BEFORE YOU GO',fields:'<p class="dialog-body-copy">'+e(copy)+'</p>',submit,onSubmit});
  D.openDiagram = (model,title=model.title) => {
    let dialog=$('#diagram-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='diagram-dialog';dialog.className='diagram-dialog';document.body.append(dialog);}
    dialog.innerHTML='<div class="panel-header"><h2 class="section-title">'+e(title)+'</h2><button class="icon-control" data-dismiss-diagram aria-label="Close full flow preview">'+icon('close')+'</button></div>'+diagram(model,'',true);
    dialog.setAttribute('aria-label',title+' — full flow preview');dialog.showModal();
  };
  function draftMenu(item,inCollection=false){
    const id=e(item.model.id),name=e(item.model.title);
    return '<details class="card-menu"><summary aria-label="Actions for '+name+'">•••</summary><div class="popover">'+
      '<a href="'+url('canvas',item.model.id)+'">Open flow ↗</a><a href="'+url('flow',item.model.id)+'">Flow details</a>'+
      '<button data-cmd="rename-flow" data-id="'+id+'">Rename</button><button data-cmd="duplicate-flow" data-id="'+id+'">Duplicate</button>'+
      (inCollection?'<button data-cmd="remove-from-collection" data-id="'+id+'">Remove from collection</button>':'')+
      '<button class="danger" data-cmd="trash-flow" data-id="'+id+'">Move to Trash…</button></div></details>';
  }
  function draftCard(item,inCollection=false){
    return '<article class="draft-card"><a href="'+url('canvas',item.model.id)+'" aria-label="Open '+e(item.model.title)+'">'+diagram(item.model)+'</a><div class="card-copy">'+
      (inCollection?'<div class="tag-row">'+(item.tags.length?item.tags.slice(0,2).map(t=>tag(t)).join(''):tag(item.model.style))+'</div>':'')+
      '<div class="card-title-row"><h3><a href="'+url('canvas',item.model.id)+'">'+e(item.model.title)+'</a></h3>'+draftMenu(item,inCollection)+'</div>'+
      '<p class="card-meta">'+e(D.date(item.savedAt))+' · '+item.model.nodes.length+' steps</p>'+
      '<div class="card-bottom"><a class="text-link" href="'+url('canvas',item.model.id)+'">Open flow <span aria-hidden="true">↗</span></a></div></div></article>';
  }
  function draftList(items){
    return '<div class="draft-list"><div class="draft-list-head" aria-hidden="true"><span></span><span>NAME</span><span>EDITED</span><span>STEPS</span><span></span></div>'+items.map(item=>
      '<article class="draft-list-row"><a href="'+url('canvas',item.model.id)+'" tabindex="-1" aria-hidden="true">'+diagram(item.model)+'</a><div class="draft-list-identity"><h3><a href="'+url('canvas',item.model.id)+'">'+e(item.model.title)+'</a></h3><span class="list-inline-meta">'+e(D.date(item.savedAt))+' · '+item.model.nodes.length+' steps</span></div><span class="list-date">'+e(D.date(item.savedAt))+'</span><span class="list-steps">'+item.model.nodes.length+' steps</span><div class="list-actions"><a class="text-link" href="'+url('canvas',item.model.id)+'">Open ↗</a>'+draftMenu(item)+'</div></article>').join('')+'</div>';
  }
  function workspace(){
    const drafts=D.activeDrafts(),latest=drafts[0];
    let html=heading('YOUR LITTLE COLLECTION','A little space for your next idea.','Pick up a thought, or give a new one a little room.',link('＋ New flow','canvas.php?new=1')+link('Start from a template ↗','templates.php',true));
    if(!latest)return html+empty('Good things start with a rough thought.','No saved flows yet. Create a flow and save a draft — it will be waiting here when you come back.',link('Create your first flow →','canvas.php?new=1'));
    html+='<section class="latest-flow"><div class="latest-summary"><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>'+e(latest.model.title)+'</h2><p class="small-copy">Edited '+e(D.date(latest.savedAt))+' · '+latest.model.nodes.length+' steps</p>'+link('Continue flow →',url('canvas',latest.model.id))+'</div>'+diagram(latest.model)+'</section>';
    html+='<section class="draft-section"><div class="section-toolbar"><div class="section-title-wrap"><h2 class="section-title">Your drafts</h2><span id="draft-count">'+drafts.length+' flows</span></div><div class="collection-tools">'+searchBox('Search your flows…','drafts',state.search)+'<div class="view-switch" role="group" aria-label="Draft view"><button data-cmd="view-grid" aria-pressed="'+(state.view==='grid')+'">'+icon('grid')+'<span>Grid</span></button><button data-cmd="view-list" aria-pressed="'+(state.view==='list')+'">'+icon('list')+'<span>List</span></button></div></div></div><div id="draft-results">'+workspaceResults()+'</div></section>';
    return html;
  }
  function workspaceResults(){
    const all=D.activeDrafts(),items=all.filter(d=>d.model.title.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
    if(!items.length)return empty('A thought is hiding somewhere.','No flows match “'+state.search+'”. Try another name, or clear the search.',button('Clear search','clear-search','',true),true);
    if(state.view==='list')return draftList(items);
    return '<div class="draft-grid">'+items.map(item=>draftCard(item)).join('')+
      '<a class="draft-create-tile '+(items.length%2?'is-odd':'')+'" href="canvas.php?new=1"><h3>Room for the next thought.</h3><p class="small-copy">A blank page, or a beginning to borrow.</p><span class="text-link">＋ New flow</span></a></div>';
  }
  function templateCard(key){
    const item=D.templates[key],model=D.templateModel(key),collection=params.get('collection');
    return '<article class="template-choice"><a href="'+url('template',key,collection?{collection}:{} )+'" aria-label="Preview '+e(item.title)+'">'+diagram(model)+'</a><div class="template-copy"><div class="template-meta"><span class="category-label">'+e(item.category.toUpperCase())+'</span><small>'+model.nodes.length+' steps</small></div><h2>'+e(item.title)+'</h2><p>'+e(item.description)+'</p><div class="card-bottom"><a class="text-link" href="'+url('template',key,collection?{collection}:{})+'">Preview flow ↗</a>'+button('Use template →','use-template','data-template="'+key+'"')+'</div></div></article>';
  }
  function templates(){
    const categories=['All','Onboarding','Checkout','Support','Approval'];if(!categories.includes(state.category))state.category='All';
    return heading('BORROW A BEGINNING','A beginning, already on paper.','A few everyday journeys. Choose one, then take it somewhere of your own.')+
      '<div class="filter-bar"><div class="category-tabs" role="group" aria-label="Template categories">'+categories.map(c=>'<button data-cmd="category" data-category="'+c+'" aria-pressed="'+(state.category===c)+'">'+e(c==='All'?'All templates · 4':c)+'</button>').join('')+'</div>'+searchBox('Find a starting point…','templates',state.search)+'</div><div id="template-results">'+templateResults()+'</div><div class="quiet-footer"><span>No account needed. Your flow stays in this browser.</span><a class="text-link" href="canvas.php?new=1">Prefer a blank page? New flow ↗</a></div>';
  }
  function templateResults(){
    const keys=Object.keys(D.templates).filter(key=>{
      const item=D.templates[key];return (state.category==='All'||item.category===state.category)&&
        (item.title+' '+item.category+' '+item.description).toLocaleLowerCase().includes(state.search.toLocaleLowerCase());
    });
    return keys.length?'<div class="template-grid-app">'+keys.map(templateCard).join('')+'</div>':empty('A different beginning, perhaps?','No templates match this search. Choose another category or clear the search.',button('Show all templates','clear-template-filters','',true),true);
  }
  function templateDetails(){
    const key=params.get('id')||'onboarding',item=Object.hasOwn(D.templates,key)?D.templates[key]:null;
    if(!item)return heading('TEMPLATES','That beginning is missing.','Choose one of the four starting points in the gallery.')+link('← All templates','templates.php',true);
    const model=D.templateModel(key);
    const guides=key==='approval'?['Bring the request and a little context.','Check the details before making a decision.','Move forward or ask for a revision.','Make the changes, then return to review.','Give the approved idea its next step.']:item.steps.map((s,i)=>['Name the starting moment.','Make the next action clear.','Give this step a useful outcome.','Keep the next step easy to find.','End with a little more clarity.'][i]);
    return heading('TEMPLATE / '+item.category.toUpperCase(),item.title,item.description)+
      '<div class="detail-layout"><div class="detail-main">'+diagram(model,'detail-diagram')+'<div class="flow-zoom">'+button('View full flow ↗','preview-diagram','data-template="'+key+'"',true)+'</div><section class="panel panel-stack"><h2>A small story in '+model.nodes.length+' steps.</h2><ol class="step-guide">'+item.steps.map((s,i)=>'<li><span class="step-index">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+e(s)+'</strong><p>'+e(guides[i])+'</p></div></li>').join('')+'</ol></section></div><aside class="detail-aside"><section class="panel panel-stack"><span class="eyebrow">'+e(item.category.toUpperCase())+'</span><h2>A beginning to borrow.</h2><p class="panel-copy">'+model.nodes.length+' steps · '+e(model.style==='sketch'?'Sketch':'Clean')+' style<br>Fully editable'+(key==='approval'?'<br>Includes a decision and revision loop':'')+'</p>'+button('Use this template →','use-template','data-template="'+key+'"')+'<p class="small-copy">Creates a new flow. Your existing drafts stay as they are.</p></section><section class="panel panel-stack"><h2>Before you begin.</h2><ul class="tip-list">'+item.tips.map(t=>'<li>'+e(t)+'</li>').join('')+'</ul></section><a class="text-link" href="templates.php">← Explore other templates</a></aside></div>';
  }
  function flowDetails(){
    const item=resolveEntry();if(!item)return unavailable();
    state.tags=[...item.tags];
    return heading('MY WORKSPACE / FLOW DETAILS',item.model.title,'Give the flow a little context before you give it its next step.')+
      '<div class="flow-details-layout"><form class="details-form" data-form="flow-details" data-id="'+e(item.model.id)+'"><div class="field-group"><label for="flow-name">Flow name</label><input id="flow-name" name="title" required maxlength="60" value="'+e(item.model.title)+'" autocomplete="off"></div><div class="field-group"><label for="flow-description">A little context</label><textarea id="flow-description" name="description" maxlength="2000" placeholder="What is this flow about?">'+e(item.description)+'</textarea></div><div class="field-group"><label for="flow-goal">What should this flow make clearer?</label><textarea class="goal-field" id="flow-goal" name="goal" maxlength="1000" placeholder="The outcome you are working toward.">'+e(item.goal)+'</textarea></div><div class="field-group"><label for="new-tag">Tags</label><div class="tag-row" id="flow-tags">'+tagControls()+'</div><div class="tag-input-wrap"><input id="new-tag" maxlength="32" placeholder="Add a tag" autocomplete="off"><button type="button" class="button button-quiet" data-cmd="add-tag">＋ Add tag</button></div><p class="field-help">Up to 12 tags. Press Enter to add one.</p></div><div class="field-group"><label for="flow-collection">Keep it with</label><select id="flow-collection" name="collectionId">'+collectionOptions(item.collectionId)+'</select><p class="field-help">Group related flows without changing the flows themselves.</p></div><div class="action-row"><button type="submit" class="button">Save details ✓</button>'+link('Cancel','workspace.php',true)+'</div><p class="form-error" id="flow-form-error" role="alert"></p></form><aside class="detail-aside"><section class="panel panel-stack summary-preview"><span class="eyebrow">THE WHOLE PICTURE</span>'+diagram(item.model)+'<div class="summary-meta"><span>'+item.model.nodes.length+' steps · '+item.model.edges.length+' connections</span>'+tag(item.model.style==='sketch'?'Sketch':'Clean')+'</div>'+link('Open in canvas ↗',url('canvas',item.model.id))+'</section><section class="panel panel-stack"><h2>Take the next little step.</h2><div class="quick-links">'+[['play','Present this flow','present'],['history','Version history','history'],['download','Export & preview','export']].map(([ic,text,route])=>'<a href="'+url(route,item.model.id)+'">'+icon(ic)+'<span>'+text+'</span><span>↗</span></a>').join('')+'</div></section><p class="small-copy">Edited '+e(D.date(item.savedAt))+' · Saved in this browser</p></aside></div>';
  }
  function tagControls(){return state.tags.map((text,i)=>'<span class="tag '+['peach','lilac','blue'][i%3]+'">'+e(text)+'<button type="button" data-cmd="remove-tag" data-index="'+i+'" aria-label="Remove tag '+e(text)+'">×</button></span>').join('');}
  function collections(){
    const list=D.collections(),selected=list.find(c=>c.id===state.collection)||(!state.collection?list[0]:null);
    if(!selected)return heading('COLLECTIONS','A few flows. One bigger thought.','Keep related journeys together around a bigger idea.',button('＋ New collection','create-collection'))+
      empty(list.length?'This collection is no longer here.':'Give a bigger idea a little room.',list.length?'Choose another collection, or create a new one.':'Create a collection, then add flows from My Workspace. Your flows remain editable on their own.',list.length?link('All collections','collections.php',true):button('Create a collection','create-collection'));
    state.collection=selected.id;
    const count=D.activeDrafts().filter(d=>d.collectionId===selected.id).length;
    return heading('COLLECTIONS / '+selected.name.toUpperCase(),'A few flows. One bigger thought.','Keep related journeys together, from a first visit to a little help later on.')+
      '<div class="collection-toolbar"><div class="collection-tabs">'+list.map(c=>button(e(c.name)+' · '+D.activeDrafts().filter(d=>d.collectionId===c.id).length,'select-collection','data-id="'+e(c.id)+'"',c.id!==selected.id)).join('')+button('＋ New collection','create-collection','',true)+'</div><div class="action-row">'+button('＋ Add an existing flow','add-to-collection','data-id="'+e(selected.id)+'"',true)+'</div></div>'+
      '<section class="collection-summary"><div><span class="category-label">'+e(selected.name.toUpperCase())+'</span><h2>'+e(selected.name)+'</h2><p>'+e(selected.description||'A little context for the flows that belong together.')+'</p><span class="small-copy">'+count+' '+(count===1?'flow':'flows')+' in this collection</span></div><details class="card-menu"><summary aria-label="Manage collection">•••</summary><div class="popover"><button data-cmd="edit-collection" data-id="'+e(selected.id)+'">Rename / edit description</button><button class="danger" data-cmd="delete-collection" data-id="'+e(selected.id)+'">Remove collection…</button></div></details></section>'+
      '<div id="collection-results">'+collectionResults(selected.id)+'</div><section class="collection-invitation"><div><h2>What other moment belongs here?</h2><p>Start from a blank page or borrow a template for this collection.</p></div><div class="action-row">'+link('Browse templates','templates.php?collection='+encodeURIComponent(selected.id),true)+link('＋ New flow','canvas.php?new=1&collection='+encodeURIComponent(selected.id))+'</div></section><p class="small-copy">Removing a flow from this collection keeps it in My Workspace.</p>';
  }
  function collectionResults(id){
    const flows=D.activeDrafts().filter(d=>d.collectionId===id);
    return flows.length?'<div class="collection-grid">'+flows.map(item=>draftCard(item,true)).join('')+'</div>':
      empty('Room for a few related thoughts.','Add an existing flow, or start a new one in this collection.',button('Add existing flows','add-to-collection','data-id="'+e(id)+'"',true),true);
  }
  let noteTimer,pendingNote=null;
  function flushNote(){
    clearTimeout(noteTimer);if(!pendingNote)return true;
    const pending=pendingNote;
    try{
      const item=D.getDraft(pending.id);if(!item)throw new Error('This flow is no longer available.');
      D.updateDraft(pending.id,{notes:{...item.notes,[pending.nodeId]:pending.value}});
      pendingNote=null;D.setDirty(false);const status=$('#note-status');if(status)status.textContent='✓ Notes saved with this flow';return true;
    }catch(error){const status=$('#note-status');if(status)status.textContent='Notes not saved yet';D.toast(error.message);return false;}
  }
  D.flushNotes=flushNote;
  window.addEventListener('pagehide',flushNote);
  function present(){
    const item=resolveEntry();if(!item)return unavailable();
    state.step=Math.max(0,Math.min(item.model.nodes.length-1,state.step));const node=item.model.nodes[state.step];
    return heading(item.model.title.toUpperCase()+' / PRESENTATION','One step closer to the whole picture.','Walk through the flow one thought at a time.')+
      '<div class="section-toolbar"><div class="action-row">'+button(document.body.classList.contains('is-fullscreen')?'Exit full screen':'Full screen','fullscreen','',true)+button(state.notesVisible?'Notes ●':'Notes ○','toggle-notes','aria-pressed="'+state.notesVisible+'"',true)+'</div><a class="text-link" href="'+url('flow',item.model.id)+'">Exit presentation ↗</a></div>'+
      '<div class="present-layout '+(!state.notesVisible?'notes-hidden':'')+'"><section class="presentation-stage"><div class="presentation-meta"><span class="eyebrow">STEP '+String(state.step+1).padStart(2,'0')+' OF '+String(item.model.nodes.length).padStart(2,'0')+'</span><span class="flow-title-mini">'+e(item.model.title)+'</span></div><div class="presentation-focus '+(item.model.style==='clean'?'clean':'')+'" style="background:'+D.colors[node.color]+'"><h2>'+e(node.label)+'</h2></div><p class="presentation-annotation">a small step. a little more clarity.</p><div class="presentation-actions">'+button('← Previous','previous-step',state.step===0?'disabled':'',true)+'<div class="slide-dots" aria-label="Presentation steps">'+item.model.nodes.map((n,i)=>'<button data-cmd="jump-step" data-step="'+i+'" aria-label="Go to step '+(i+1)+': '+e(n.label)+'" aria-current="'+(i===state.step)+'"><i></i></button>').join('')+'</div>'+button(state.step===item.model.nodes.length-1?'Back to flow ↗':'Next step →','next-step')+'</div></section>'+
      (state.notesVisible?'<aside class="panel speaker-notes"><span class="eyebrow">A LITTLE CONTEXT</span><h2>What to say here.</h2><p class="small-copy">For you while presenting.</p><label class="sr-only" for="speaker-notes">Notes for '+e(node.label)+'</label><textarea class="form-field" id="speaker-notes" data-note-flow="'+e(item.model.id)+'" data-note-node="'+e(node.id)+'" maxlength="3000" placeholder="A little context for this step…">'+e(item.notes[node.id]||'')+'</textarea><p class="small-copy" id="note-status">Notes are saved as you type.</p></aside>':'')+'</div><nav class="slide-strip" aria-label="Jump to a presentation step">'+item.model.nodes.map((n,i)=>'<button class="slide-tile" data-cmd="jump-step" data-step="'+i+'" aria-current="'+(i===state.step)+'"><span class="eyebrow">'+String(i+1).padStart(2,'0')+'</span><strong>'+e(n.label)+'</strong></button>').join('')+'</nav>';
  }
  function versionDiff(version,item){
    const changes=D.diff(version.model,item.model),old=version.metadata||{};
    for(const [key,name] of [['description','description'],['goal','objective'],['tags','tags'],['collectionId','collection'],['notes','speaker notes']]){
      if(JSON.stringify(old[key]??null)!==JSON.stringify(item[key]??null))changes.push({kind:'changed',text:'Updated the flow’s '+name+'.'});
    }return changes;
  }
  function historyPage(){
    const item=resolveEntry();if(!item)return unavailable();
    const versions=item.versions;
    const selected=state.selectedVersion==='current'?null:(versions.find(v=>v.id===state.selectedVersion)||(!state.selectedVersion?versions[0]:null));
    const model=selected?.model||item.model,changes=selected?versionDiff(selected,item):[],changed=state.compare?changes.filter(c=>c.id).map(c=>c.id):[];
    return heading(item.model.title.toUpperCase()+' / VERSION HISTORY','A little history. A way back.','Save a version at a meaningful moment. Come back when you need to.')+
      '<div class="history-layout"><aside class="version-sidebar">'+button('＋ Save a version','save-version','data-id="'+e(item.model.id)+'"')+'<p class="small-copy">'+versions.length+' saved '+(versions.length===1?'version':'versions')+' · Newest first</p><div class="history-mobile-select field-group"><label for="history-select">Saved version</label><select id="history-select" data-version-select><option value="current" '+(!selected?'selected':'')+'>Current flow</option>'+versions.map(v=>'<option value="'+e(v.id)+'" '+(v.id===selected?.id?'selected':'')+'>'+e(v.name)+'</option>').join('')+'</select></div><button class="version-tile" data-cmd="select-version" data-version="current" aria-pressed="'+!selected+'"><strong>Current flow</strong><small>'+e(D.dateTime(item.savedAt))+'</small><span class="version-state">'+item.model.nodes.length+' steps · Current</span></button>'+versions.map(v=>'<button class="version-tile" data-cmd="select-version" data-version="'+e(v.id)+'" aria-pressed="'+(v.id===selected?.id)+'"><strong>'+e(v.name)+'</strong><small>'+e(D.dateTime(v.createdAt))+'</small><span class="version-state">'+v.model.nodes.length+' steps'+(v.id===selected?.id?' · Selected':'')+'</span></button>').join('')+'<p class="small-copy">Versions are stored with this flow in this browser.</p></aside><div class="history-main"><section class="panel panel-stack version-preview"><div class="panel-header"><div><span class="category-label">'+(selected?'SELECTED VERSION':'CURRENT FLOW')+'</span><h2>'+e(selected?.name||item.model.title)+'</h2></div>'+tag(D.date(selected?.createdAt||item.savedAt))+'</div>'+diagram(model,'',D.preferences().grid,{changed})+
      (selected?'<div class="compare-toggle"><span>Compare with the current flow</span><label><input type="checkbox" id="compare-versions" '+(state.compare?'checked':'')+'> Show changes</label></div>':'<p class="small-copy">The latest saved state of this flow.</p>')+'</section>'+
      (selected?'<section class="panel panel-stack"><h2>What changed since this thought?</h2>'+(!state.compare?'<p class="panel-copy">Turn on Show changes to compare this version with the current flow.</p>':changes.length?'<ul class="change-list">'+changes.map(c=>'<li><span class="change-marker '+c.kind+'">'+({added:'＋',removed:'−',changed:'↔'}[c.kind])+'</span><span>'+e(c.text)+'</span></li>').join('')+'</ul>':'<p class="panel-copy">No changes. This version matches the current flow.</p>')+'</section><section class="panel restore-block"><div><h2>Pick this thought up again?</h2><p class="small-copy">Restoring creates a new current version. Your saved history stays here.</p></div>'+button('Restore this version ↺','restore-version','data-id="'+e(item.model.id)+'" data-version="'+e(selected.id)+'"')+'</section>':empty('Keep a milestone, not every keystroke.','Save a named version when this thought reaches a meaningful point.',button('Save the first version','save-version','data-id="'+e(item.model.id)+'"'),true))+'</div></div>';
  }
  function exportPage(){
    const item=resolveEntry();if(!item)return unavailable();
    if(state.exportName===null)state.exportName=D.filename(item.model.title);
    const radios=[['paper','Paper & dots'],['white','Plain white'],['transparent','Transparent']];
    const sheet=diagram(item.model,'',state.background==='paper');
    return heading(item.model.title.toUpperCase()+' / EXPORT','Take the whole picture.','Choose the finish. Check the preview. Take your flow with you.')+
      '<div class="export-layout"><div class="export-controls"><fieldset class="export-control-group"><legend>File format</legend><div class="segmented" role="group" aria-label="Export format">'+['png','svg','pdf'].map(format=>'<button data-cmd="export-format" data-format="'+format+'" aria-pressed="'+(state.exportFormat===format)+'">'+format.toUpperCase()+'</button>').join('')+'</div><p class="field-help">'+({png:'A crisp image for slides, briefs, and sharing.',svg:'Scalable artwork with the local font embedded.',pdf:'A landscape page, ready to share or print.'}[state.exportFormat])+'</p></fieldset><fieldset class="export-control-group"><legend>Background</legend><div class="radio-options">'+radios.map(([value,text])=>'<label><input type="radio" name="export-background" value="'+value+'" '+(state.background===value?'checked':'')+' '+(value==='transparent'&&state.exportFormat==='pdf'?'disabled':'')+'><span class="background-swatch '+value+'"></span>'+text+'</label>').join('')+'</div>'+(state.exportFormat==='pdf'?'<p class="field-help">PDF uses a solid page background.</p>':'')+'</fieldset><div class="field-group"><label for="export-scale">Image size</label><select id="export-scale" '+(state.exportFormat!=='png'?'disabled':'')+'>'+[1,2,3].map(scale=>'<option value="'+scale+'" '+(state.scale===scale?'selected':'')+'>'+scale+'× · '+(1100*scale)+' × '+(380*scale)+' px</option>').join('')+'</select><p class="field-help">'+(state.exportFormat==='svg'?'SVG scales without losing clarity.':state.exportFormat==='pdf'?'A4 landscape · artwork rendered at 2×.':'More room for a clear, readable export.')+'</p></div><div class="field-group"><label for="export-filename">File name</label><input id="export-filename" maxlength="80" value="'+e(state.exportName)+'" autocomplete="off"><p class="field-help">.'+state.exportFormat+' is added automatically.</p></div>'+button('Download '+state.exportFormat.toUpperCase()+' ↓','download-export')+'<p class="small-copy">Your file is created on this device.</p></div><div class="export-preview"><div class="preview-toolbar"><span class="eyebrow">PREVIEW</span><div class="zoom-tools"><button data-cmd="zoom-out" aria-label="Zoom out">−</button><button data-cmd="zoom-fit" aria-label="Fit preview">'+Math.round(state.zoom*100)+'%</button><button data-cmd="zoom-in" aria-label="Zoom in">＋</button></div></div><div class="export-mat"><div class="export-sheet '+(state.background==='transparent'?'checkerboard':'')+'" style="width:'+Math.round(state.zoom*100)+'%;background:'+(state.background==='transparent'?'':state.background==='white'?'#ffffff':'#fffefb')+'">'+sheet+'</div></div><div class="export-stats"><span>'+e(state.exportFormat==='png'?(1100*state.scale)+' × '+(380*state.scale)+' px':state.exportFormat==='svg'?'1100 × 380 viewBox':'A4 landscape')+' · '+state.exportFormat.toUpperCase()+'</span><span>'+item.model.nodes.length+' steps · '+item.model.edges.length+' connections</span></div><section class="panel panel-stack export-guidance"><h2>A copy for the conversation.</h2><p class="panel-copy">Choose SVG for scalable artwork, or PDF for a page to share. To reopen and edit a flow later, keep a workspace backup in Settings.</p></section></div></div>';
  }
  function trashPage(){
    const items=D.trashedDrafts();
    const hero=heading('MY WORKSPACE / TRASH','Some thoughts need a little time.','Deleted flows stay here for 30 days. Bring one back, or let it go for good.');
    if(!items.length)return hero+empty('A little breathing room.','Trash is empty. Flows moved here can be restored for 30 days.',link('← My Workspace','workspace.php',true));
    return hero+'<div class="section-toolbar"><span class="muted">'+items.length+' '+(items.length===1?'flow':'flows')+' in Trash</span>'+button('Empty Trash','empty-trash','',true)+'</div><section class="trash-table"><div class="trash-table-head" aria-hidden="true"><span>FLOW</span><span>DELETED</span><span>TIME LEFT</span><span>ACTIONS</span></div>'+items.map(item=>{
      const remaining=Math.max(0,Math.ceil((30*D.DAY-(Date.now()-item.deletedAt))/D.DAY));
      return '<article class="trash-row"><div class="trash-name"><h2>'+e(item.model.title)+'</h2><p>'+item.model.nodes.length+' steps · '+e(collectionName(item.collectionId))+'</p></div><span class="trash-date">'+e(D.date(item.deletedAt))+'</span><span class="trash-retention">'+remaining+' '+(remaining===1?'day':'days')+' left</span><div class="trash-actions">'+button('Restore ↺','restore-trash','data-id="'+e(item.model.id)+'"',true)+'<button class="danger" data-cmd="delete-forever" data-id="'+e(item.model.id)+'" aria-label="Permanently delete '+e(item.model.title)+'">'+icon('trash')+'</button></div></article>';
    }).join('')+'</section><section class="trash-guidance"><div><h2>A second chance for a rough idea.</h2><p class="panel-copy">Restored flows return to My Workspace with their details, notes, and saved versions. If the original collection is gone, the flow returns without a collection.</p><p class="small-copy">Trash is private to this browser. Permanent deletion always asks for confirmation.</p></div></section>';
  }
  function settingsPage(){
    const prefs=state.draftPrefs,all=D.readDrafts(),collections=D.collections(),versions=all.reduce((n,d)=>n+d.versions.length,0);
    const model=D.linearScene(['A thought','A next step','A little win'],'A familiar kind of paper',prefs.style);model.nodes.forEach(n=>n.color=prefs.color);
    return heading('YOUR WORKSPACE / SETTINGS','Make a little room your own.','Choose how new flows begin, and keep a copy of the thoughts you want to keep.')+
      '<div class="settings-layout"><nav class="settings-sidebar" aria-label="Settings sections"><a href="#appearance" aria-current="'+(location.hash!=='#backups'&&location.hash!=='#privacy')+'">'+icon('palette')+'Appearance</a><a href="#backups" aria-current="'+(location.hash==='#backups')+'">'+icon('database')+'Data & backups</a><a href="#privacy" aria-current="'+(location.hash==='#privacy')+'">'+icon('shield')+'Privacy</a><p class="small-copy">For this browser only.<br>No account or cloud sync.</p></nav><div class="settings-main"><form class="panel panel-stack" id="appearance" data-form="preferences"><div class="panel-header"><h2>A familiar kind of paper.</h2>'+tag('DEFAULTS FOR NEW FLOWS')+'</div><div class="settings-appearance-grid"><div class="preference-controls"><fieldset class="export-control-group"><legend>Default flow style</legend><div class="segmented" role="group" aria-label="Default flow style">'+['sketch','clean'].map(style=>'<button type="button" data-cmd="preference-style" data-style="'+style+'" aria-pressed="'+(prefs.style===style)+'">'+(style==='sketch'?'Sketch':'Clean')+'</button>').join('')+'</div></fieldset><label class="switch-label"><span>Show the dot grid<small>A little structure under the idea.</small></span><span class="switch"><input type="checkbox" name="grid" '+(prefs.grid?'checked':'')+' aria-label="Show the dot grid"><span></span></span></label><fieldset class="export-control-group"><legend>Default step color</legend><div class="palette-options">'+Object.entries(D.colors).map(([name,hex])=>'<label><input type="radio" name="color" value="'+name+'" '+(prefs.color===name?'checked':'')+' aria-label="'+name+'"><span style="background:'+hex+'"></span></label>').join('')+'</div></fieldset></div><div class="appearance-preview" id="appearance-preview">'+diagram(model,'',prefs.grid)+'<p class="field-help">A preview of the next flow you create.</p></div></div><div class="preference-save-row"><p class="small-copy">Existing flows keep their current style.</p><button type="submit" class="button">Save preferences ✓</button></div></form><section class="panel panel-stack" id="backups"><span class="category-label">DATA & BACKUPS</span><h2>Keep a copy of the whole collection.</h2><p class="panel-copy">A Draftline backup includes flows, collections, details, notes, and saved versions.</p><div class="backup-columns"><section><h3>Save a backup</h3><p>'+all.length+' flows · '+collections.length+' collections · '+versions+' saved versions'+(all.some(d=>d.deletedAt)?'<br>Includes flows currently in Trash.':'')+'</p>'+button('Download backup.json ↓','download-backup','',true)+'</section><section><h3>Bring a backup back</h3><p>Choose a Draftline JSON file to review before import. Files stay on this device.</p>'+button('Choose backup file ↑','choose-backup','',true)+'<input type="file" class="backup-file-input" id="backup-file" accept=".json,application/json" aria-label="Choose Draftline backup"></section></div>'+backupReview()+'<p class="small-copy">Import creates new copies. Existing flows and collections stay as they are.</p>'+(D.storageIssue?button('Download a raw recovery copy','download-raw','',true):'')+'</section><section class="panel panel-stack privacy-panel" id="privacy"><h2>Your thoughts stay yours.</h2><ul><li>Drafts and preferences are kept in local storage in this browser.</li><li>The current canvas is kept temporarily in this browser session.</li><li>No account, cloud sync, analytics, or remote font requests.</li><li>Trash expires after 30 days when Draftline is opened.</li><li>Clearing site data can remove drafts and versions. Keep a backup for an independent copy.</li></ul></section></div></div>';
  }
  function backupReview(){
    const pending=state.pendingBackup;if(!pending)return '';
    return '<section class="import-review" aria-labelledby="import-title"><span class="category-label">REVIEW BEFORE IMPORT</span><h3 id="import-title">A few thoughts to bring back.</h3><p class="small-copy">✓ '+e(state.pendingName)+' is ready to import.</p><div class="import-counts">'+tag(pending.drafts.length+' flows')+tag(pending.collections.length+' collections')+tag(pending.versions+' saved versions')+(pending.trash?tag(pending.trash+' in Trash'):'')+'</div><p class="panel-copy">Imports as new copies. Your current flows, collections, and preferences stay as they are.</p><div class="action-row">'+button('Import as new copies →','import-backup')+button('Cancel','cancel-import','',true)+'</div></section>';
  }
  function showStorageIssue(){
    const status=$('#storage-status');if(!status)return;
    status.innerHTML=D.storageIssue?'<div class="storage-banner">'+e(D.storageIssue)+' <a href="settings.php#backups">Data & backups ↗</a></div>':'';
  }
  function render(){
    if(!page)return;
    const root=$('#page-content');
    const active=document.activeElement,focusCommand=root.contains(active)&&active.dataset.cmd?{...active.dataset}:null;
    const focusForm=root.contains(active)&&active.type==='submit'?active.closest('[data-form]')?.dataset.form:null;
    try{
      root.innerHTML=({workspace,templates,template:templateDetails,flow:flowDetails,collections,present,history:historyPage,export:exportPage,trash:trashPage,settings:settingsPage}[page]||workspace)();
      root.setAttribute('aria-busy','false');showStorageIssue();
      if(focusCommand){
        const next=$$('[data-cmd]',root).find(el=>Object.entries(focusCommand).every(([key,value])=>el.dataset[key]===value));
        next?.focus({preventScroll:true});
      }else if(focusForm){
        $$('form[data-form]',root).find(form=>form.dataset.form===focusForm)?.querySelector('button[type="submit"]')?.focus({preventScroll:true});
      }
    }catch(error){root.innerHTML=empty('This thought needs a little care.',error.message||'The page could not be loaded.',link('My Workspace','workspace.php',true));root.setAttribute('aria-busy','false');}
  }
  function addTag(){
    const input=$('#new-tag'),tagText=input?.value.trim();if(!tagText)return;
    if(state.tags.length>=12){D.toast('A little room for up to 12 tags.');return;}
    if(!state.tags.some(t=>t.toLocaleLowerCase()===tagText.toLocaleLowerCase()))state.tags.push(tagText.slice(0,32));
    input.value='';$('#flow-tags').innerHTML=tagControls();D.setDirty(true);input.focus();
  }
  function selectVersion(version){
    state.selectedVersion=version;
    const next=new URL(location);next.searchParams.set('version',version);history.replaceState(history.state,'',next);render();
  }
  function editCollection(id=null){
    const current=id?D.collections().find(c=>c.id===id):null;
    if(id&&!current)throw new Error('This collection is no longer available.');
    D.dialog({title:current?'What belongs together?':'A home for related thoughts.',eyebrow:'NAME THE COLLECTION',submit:current?'Save collection':'Create collection',
      fields:'<label for="collection-name">Collection name</label><input id="collection-name" name="name" maxlength="60" required value="'+e(current?.name||'')+'" autocomplete="off"><label for="collection-description">A little context</label><textarea id="collection-description" name="description" maxlength="1000">'+e(current?.description||'')+'</textarea>',
      onSubmit:form=>{const result=D.saveCollection({name:form.get('name'),description:form.get('description')},id);state.collection=result.id;render();D.toast(current?'A little clearer.':'A little home for the bigger thought.');}});
  }
  const commands={
    'rename-flow':el=>{const item=D.getDraft(el.dataset.id);if(!item)throw new Error('This draft is no longer available.');D.dialog({title:'What are we mapping?',eyebrow:'NAME THE THOUGHT',submit:'Save name ✓',fields:'<label for="rename-flow-name">Draft name</label><input id="rename-flow-name" name="title" value="'+e(item.model.title)+'" maxlength="60" required autocomplete="off">',onSubmit:form=>{D.rename(item.model.id,form.get('title'));render();D.toast('A good thought deserves a name.');}});},
    'duplicate-flow':el=>{D.duplicate(el.dataset.id);render();D.toast('A copy with a little room to change.');},
    'trash-flow':el=>{const item=D.getDraft(el.dataset.id);if(!item)throw new Error('This draft is no longer available.');D.confirm('Move this thought aside?','Move “'+item.model.title+'” to Trash? You can restore it within 30 days.','Move to Trash',()=>{D.moveToTrash(item.model.id);render();D.toast('Moved to Trash. You can bring it back within 30 days.');});},
    'view-grid':()=>{state.view='grid';D.savePreferences({view:'grid'});render();},
    'view-list':()=>{state.view='list';D.savePreferences({view:'list'});render();},
    'clear-search':()=>{state.search='';render();$('[data-filter="drafts"]')?.focus();},
    category:el=>{state.category=el.dataset.category;render();},
    'clear-template-filters':()=>{state.category='All';state.search='';render();},
    'use-template':el=>{const item=D.createFromTemplate(el.dataset.template,params.get('collection'));D.remember(item.model);location.href=url('canvas',item.model.id);},
    'preview-diagram':el=>{const item=resolveEntry(),model=el.dataset.template?D.templateModel(el.dataset.template):item?.model;if(model)D.openDiagram(model);},
    'add-tag':addTag,
    'remove-tag':el=>{state.tags.splice(Number(el.dataset.index),1);$('#flow-tags').innerHTML=tagControls();D.setDirty(true);},
    'create-collection':()=>editCollection(),
    'edit-collection':el=>editCollection(el.dataset.id),
    'select-collection':el=>{state.collection=el.dataset.id;const next=new URL(location);next.searchParams.set('id',state.collection);history.replaceState(history.state,'',next);render();},
    'delete-collection':el=>{const item=D.collections().find(c=>c.id===el.dataset.id);if(!item)return;D.confirm('Let this collection go?','Remove “'+item.name+'”? Its flows stay in My Workspace.','Remove collection',()=>{D.removeCollection(item.id);state.collection=null;render();D.toast('Collection removed. Your flows are still here.');});},
    'add-to-collection':el=>{
      const id=el.dataset.id,available=D.activeDrafts().filter(d=>d.collectionId!==id);
      if(!available.length){D.toast('All your saved flows are already here. Create a new flow to add another.');return;}
      D.dialog({title:'Which thoughts belong here?',submit:'Add selected flows',fields:'<p class="dialog-body-copy">Each flow belongs to one collection. Moving it keeps its content and history.</p><fieldset class="choice-list"><legend class="sr-only">Choose flows</legend>'+available.map(d=>'<label><input type="checkbox" name="flows" value="'+e(d.model.id)+'"><span>'+e(d.model.title)+'<small class="muted"> · '+e(collectionName(d.collectionId))+'</small></span></label>').join('')+'</fieldset>',onSubmit:form=>{const ids=form.getAll('flows');if(!ids.length)throw new Error('Choose at least one flow.');D.assignCollection(ids,id);render();D.toast('A few related thoughts, together.');}});
    },
    'remove-from-collection':el=>{D.updateDraft(el.dataset.id,{collectionId:null});render();D.toast('Removed from the collection. Kept in My Workspace.');},
    'previous-step':()=>{if(!flushNote())return;state.step=Math.max(0,state.step-1);render();},
    'next-step':()=>{if(!flushNote())return;const item=resolveEntry();if(!item)return;if(state.step>=item.model.nodes.length-1){location.href=url('flow',item.model.id);return;}state.step++;render();},
    'jump-step':el=>{if(!flushNote())return;state.step=Number(el.dataset.step);render();},
    'toggle-notes':()=>{if(!flushNote())return;state.notesVisible=!state.notesVisible;render();},
    fullscreen:async()=>{
      if(document.body.classList.contains('is-fullscreen')){document.body.classList.remove('is-fullscreen');if(document.fullscreenElement)await document.exitFullscreen();render();return;}
      document.body.classList.add('is-fullscreen');try{await document.documentElement.requestFullscreen();}catch{}render();
    },
    'save-version':el=>{
      const item=D.getDraft(el.dataset.id);if(!item)return;
      D.dialog({title:'Give this moment a name.',eyebrow:'KEEP A MILESTONE',submit:'Save version ✓',fields:'<label for="version-name">Version name</label><input id="version-name" name="name" maxlength="80" required value="v'+(item.versions.length+1)+' · A saved thought" autocomplete="off">',onSubmit:form=>{const version=D.saveVersion(item.model.id,form.get('name'));state.selectedVersion=version.id;render();D.toast('A milestone for the way back.');}});
    },
    'select-version':el=>selectVersion(el.dataset.version),
    'restore-version':el=>{const item=D.getDraft(el.dataset.id),version=item?.versions.find(v=>v.id===el.dataset.version);if(!version)return;D.confirm('Pick this thought up again?','Restore “'+version.name+'”? The current flow is saved as a version first. Your existing history stays here.','Restore version ↺',()=>{const restored=D.restoreVersion(item.model.id,version.id);state.selectedVersion=restored.id;render();D.toast('A good thought, picked up again.');});},
    'export-format':el=>{state.exportFormat=el.dataset.format;if(state.exportFormat==='pdf'&&state.background==='transparent')state.background='white';render();},
    'zoom-in':()=>{state.zoom=Math.min(2,state.zoom+.25);render();},
    'zoom-out':()=>{state.zoom=Math.max(.5,state.zoom-.25);render();},
    'zoom-fit':()=>{state.zoom=1;render();},
    'download-export':async el=>{
      const item=resolveEntry();if(!item)return;el.disabled=true;
      try{
        const name=D.filename((state.exportName||item.model.title).replace(/\.(svg|png|pdf)$/i,''));
        let blob;
        if(state.exportFormat==='svg')blob=new Blob([await D.exportSvg(item.model,state.background)],{type:'image/svg+xml;charset=utf-8'});
        else if(state.exportFormat==='pdf')blob=await D.pdf(item.model,state.background);
        else{const canvas=await D.rasterize(item.model,state.background,state.scale);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('The PNG could not be created. Try a smaller image size.');}
        D.download(blob,name+'.'+state.exportFormat);D.toast('The whole picture, ready to take with you.');
      }finally{el.disabled=false;}
    },
    'restore-trash':el=>{D.restoreDraft(el.dataset.id);render();D.toast('Restored to My Workspace.');},
    'delete-forever':el=>{const item=D.getDraft(el.dataset.id,true);if(!item?.deletedAt)return;D.confirm('Let this thought go for good?','“'+item.model.title+'” and its saved versions will be permanently deleted. This cannot be undone.','Delete permanently',()=>{D.deleteForever(item.model.id);render();D.toast('Permanently deleted from this browser.');});},
    'empty-trash':()=>D.confirm('Let these thoughts go for good?','Permanently delete all '+D.trashedDrafts().length+' flows in Trash, including their saved versions? This cannot be undone.','Empty Trash',()=>{D.emptyTrash();render();D.toast('Trash is empty.');}),
    'preference-style':el=>{state.draftPrefs.style=el.dataset.style;state.preferenceDirty=true;D.setDirty(true);render();},
    'download-backup':()=>D.download(new Blob([JSON.stringify(D.makeBackup(),null,2)],{type:'application/json'}),'draftline-backup-'+new Date().toISOString().slice(0,10)+'.json'),
    'download-raw':()=>D.download(new Blob([JSON.stringify(D.rawBackup(),null,2)],{type:'application/json'}),'draftline-raw-recovery.json'),
    'choose-backup':()=>$('#backup-file').click(),
    'cancel-import':()=>{state.pendingBackup=null;state.pendingName='';render();},
    'import-backup':()=>{
      if(!state.pendingBackup)return;const count=D.importBackup(state.pendingBackup);
      state.pendingBackup=null;state.pendingName='';render();D.toast(count+' '+(count===1?'flow':'flows')+' imported as new copies.');
    }
  };
  document.addEventListener('click',async event=>{
    const dismiss=event.target.closest('[data-dismiss-dialog]');if(dismiss){$('#action-dialog')?.close();return;}
    if(event.target.closest('[data-dismiss-diagram]')){$('#diagram-dialog')?.close();return;}
    const command=event.target.closest('[data-cmd]');
    if(command){event.preventDefault();if(command.disabled)return;try{await commands[command.dataset.cmd]?.(command);}catch(error){D.toast(error.message||'The change could not be completed.');showStorageIssue();}}
    const nav=event.target.closest('[data-nav]');
    if(nav){event.preventDefault();if(nav.disabled)return;if(nav.dataset.nav==='back')history.back();else if(nav.dataset.nav==='forward')history.forward();else location.reload();}
    if(event.target instanceof HTMLDialogElement){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}
    $$('details[open]').forEach(d=>{if(!d.contains(event.target))d.open=false;});
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.filter){state.search=el.value;if(el.dataset.filter==='drafts'){$('#draft-results').innerHTML=workspaceResults();const count=D.activeDrafts().filter(d=>d.model.title.toLocaleLowerCase().includes(state.search.toLocaleLowerCase())).length;$('#draft-count').textContent=count+' flows';}else $('#template-results').innerHTML=templateResults();}
    if(el.closest('[data-form="flow-details"]'))D.setDirty(true);
    if(el.id==='export-filename')state.exportName=el.value;
    if(el.id==='speaker-notes'){
      pendingNote={id:el.dataset.noteFlow,nodeId:el.dataset.noteNode,value:el.value};D.setDirty(true);
      $('#note-status').textContent='Saving notes…';clearTimeout(noteTimer);noteTimer=setTimeout(flushNote,500);
    }
  });
  document.addEventListener('change',async event=>{
    const el=event.target;
    try{
      if(el.name==='export-background'){state.background=el.value;render();}
      if(el.id==='export-scale'){state.scale=Number(el.value);render();}
      if(el.id==='compare-versions'){state.compare=el.checked;render();}
      if(el.matches('[data-version-select]'))selectVersion(el.value);
      if(el.closest('[data-form="preferences"]')){
        if(el.name==='grid')state.draftPrefs.grid=el.checked;if(el.name==='color')state.draftPrefs.color=el.value;
        state.preferenceDirty=true;D.setDirty(true);
        const model=D.linearScene(['A thought','A next step','A little win'],'A familiar kind of paper',state.draftPrefs.style);model.nodes.forEach(n=>n.color=state.draftPrefs.color);
        $('#appearance-preview').innerHTML=diagram(model,'',state.draftPrefs.grid)+'<p class="field-help">A preview of the next flow you create.</p>';
      }
      if(el.id==='backup-file'&&el.files?.[0]){
        const file=el.files[0];if(file.size>5*1024*1024)throw new Error('Choose a backup smaller than 5 MB.');
        let data;try{data=JSON.parse(await file.text());}catch{throw new Error('This file is not valid JSON. No data has been imported.');}
        state.pendingBackup=D.reviewBackup(data);state.pendingName=file.name;render();$('.import-review')?.scrollIntoView({block:'center',behavior:'smooth'});
      }
    }catch(error){D.toast(error.message);if(el.id==='backup-file')el.value='';}
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.dataset.form)return;
    event.preventDefault();const data=new FormData(form);
    try{
      if(form.dataset.form==='flow-details'){
        const item=D.getDraft(form.dataset.id);if(!item)throw new Error('This flow is no longer available.');
        const title=String(data.get('title')||'').trim();if(!title)throw new Error('Give the flow a name first.');
        item.model.title=title;D.updateDraft(item.model.id,{model:item.model,description:String(data.get('description')||''),goal:String(data.get('goal')||''),tags:state.tags,collectionId:data.get('collectionId')||null});
        D.setDirty(false);render();D.toast('A little context. A clearer thought.');
      }
      if(form.dataset.form==='preferences'){D.savePreferences(state.draftPrefs);state.preferenceDirty=false;D.setDirty(false);render();D.toast('A familiar starting point for your next flow.');}
    }catch(error){const target=$('#flow-form-error');if(target)target.textContent=error.message;else D.toast(error.message);}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){$$('details[open]').forEach(d=>d.open=false);if(page==='present'&&document.body.classList.contains('is-fullscreen')){document.body.classList.remove('is-fullscreen');render();}return;}
    if(event.target.id==='new-tag'&&event.key==='Enter'){event.preventDefault();addTag();}
    if(page==='present'&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!event.target.isContentEditable&&!$('dialog[open]')){
      if(event.key==='ArrowRight'){event.preventDefault();commands['next-step']();}
      if(event.key==='ArrowLeft'){event.preventDefault();commands['previous-step']();}
    }
  });
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('is-fullscreen')){document.body.classList.remove('is-fullscreen');if(page==='present')render();}});
  window.addEventListener('storage',event=>{
    if(!Object.values(D.keys).includes(event.key))return;
    if(D.dirty)D.toast('This workspace changed in another tab. Your unfinished changes are still here.');
    else if(page)render();
  });
  function navigationState(){
    try{
      const key='draftline.navigation.v1',saved=JSON.parse(sessionStorage.getItem(key)||'null')||{visits:[],index:-1};
      let visit=history.state?.draftlineVisit;
      if(!visit){visit=D.uid();history.replaceState({...history.state,draftlineVisit:visit},'');}
      const old=saved.visits.indexOf(visit);
      if(old>=0)saved.index=old;else{saved.visits=saved.visits.slice(0,saved.index+1);saved.visits.push(visit);saved.index=saved.visits.length-1;}
      sessionStorage.setItem(key,JSON.stringify(saved));
      $$('[data-nav="back"]').forEach(b=>b.disabled=typeof window.navigation?.canGoBack==='boolean'?!window.navigation.canGoBack:saved.index===0&&history.length<=1);
      $$('[data-nav="forward"]').forEach(b=>b.disabled=typeof window.navigation?.canGoForward==='boolean'?!window.navigation.canGoForward:saved.index>=saved.visits.length-1);
    }catch{$$('[data-nav="back"]').forEach(b=>b.disabled=history.length<=1);}
  }
  window.addEventListener('pageshow',navigationState);window.addEventListener('popstate',navigationState);
  navigationState();
  if(page){
    try{D.purgeExpired();}catch(error){D.storageIssue=error.message;}
    document.fonts.ready.then(()=>{
      render();
      if(['#appearance','#backups','#privacy'].includes(location.hash))$(location.hash)?.scrollIntoView({block:'start'});
    });
  }
})();
