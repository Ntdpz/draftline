/* Shared browser-local data and diagram rendering. No remote services. */
(() => {
  'use strict';
  const D = window.Draftline = {};
  const KEY = D.keys = {
    drafts: 'draftline.drafts.v1', current: 'draftline.current',
    collections: 'draftline.collections.v1', preferences: 'draftline.preferences.v1'
  };
  D.colors = {peach:'#f7dfc8',lilac:'#e7ddf6',blue:'#d9eafa',green:'#e0ead5',yellow:'#f6edb7'};
  D.copy = value => JSON.parse(JSON.stringify(value));
  D.uid = () => crypto.randomUUID?.() || 'draft-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  D.escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const string = (value, max, fallback='') => typeof value === 'string' ? value.slice(0,max) : fallback;
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const DAY = D.DAY = 86400000;
  D.storageIssue = '';
  function read(key, fallback, strict=false) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? D.copy(fallback) : JSON.parse(raw);
    } catch (error) {
      D.storageIssue = 'This browser could not read your saved data. Existing storage has not been changed.';
      if (strict) throw new Error(D.storageIssue);
      return D.copy(fallback);
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key,JSON.stringify(value)); }
    catch (error) { throw new Error('This browser could not save the change. Your previous saved data is still here. Download a backup or free some browser storage.'); }
    window.dispatchEvent(new CustomEvent('draftline:changed',{detail:{key}}));
  }
  function transaction(changes) {
    const before = changes.map(([key]) => [key,localStorage.getItem(key)]);
    const serialized = changes.map(([key,value]) => [key,JSON.stringify(value)]);
    const written = [];
    try {
      for (const [key,value] of serialized) { localStorage.setItem(key,value); written.push(key); }
    } catch (error) {
      for (const [key,value] of before.reverse()) {
        if (!written.includes(key)) continue;
        try { if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value); } catch {}
      }
      throw new Error('The update could not be saved. The previous data was restored. Download a backup and check browser storage before trying again.');
    }
    window.dispatchEvent(new CustomEvent('draftline:changed'));
  }
  D.validateModel = value => {
    if (!value || typeof value !== 'object' || !Array.isArray(value.nodes) || !value.nodes.length || value.nodes.length > 8) return null;
    if (value.nodes.some(n => !n || typeof n !== 'object')) return null;
    const used = new Set(), mapping = new Map();
    const nodes = value.nodes.map((node,index) => {
      let id = string(node.id,100,'n'+(index+1));
      if(!id || used.has(id))id='n'+(index+1)+'-'+used.size;
      used.add(id); mapping.set(node.id,id);
      const w=clamp(finite(node.w,160),60,280),h=clamp(finite(node.h,68),44,150);
      return {id,label:string(node.label,42,'A new step')||'A new step',
        x:clamp(finite(node.x,30+index*125),5,1090-w),y:clamp(finite(node.y,150),8,370-h),
        w,h,color:Object.hasOwn(D.colors,node.color)?node.color:'lilac',
        shape:['step','decision','start'].includes(node.shape)?node.shape:'step'};
    });
    const edges = Array.isArray(value.edges) ? value.edges.slice(0,24).filter(e => e && mapping.has(e.from) && mapping.has(e.to) && e.from!==e.to).map(e => ({
      from:mapping.get(e.from),to:mapping.get(e.to),...(e.label?{label:string(e.label,24)}:{})
    })) : [];
    return {id:typeof value.id==='string'?value.id.slice(0,100):null,title:string(value.title,60,'An untitled thought')||'An untitled thought',
      style:value.style==='clean'?'clean':'sketch',nodes,edges};
  };
  function metadata(value={}, model) {
    const notes = {};
    for(const node of model.nodes)if(typeof value.notes?.[node.id]==='string')notes[node.id]=value.notes[node.id].slice(0,3000);
    return {description:string(value.description,2000),goal:string(value.goal,1000),
      tags:Array.isArray(value.tags)?[...new Set(value.tags.filter(t=>typeof t==='string').map(t=>t.trim().slice(0,32)).filter(Boolean))].slice(0,12):[],
      collectionId:typeof value.collectionId==='string'?value.collectionId.slice(0,100):null,notes};
  }
  function entry(value,index=0) {
    if(!value || typeof value!=='object')return null;
    const model = D.validateModel(value.model);
    if(!model)return null;
    if(!model.id)model.id='legacy-'+index+'-'+hash(JSON.stringify(model));
    const versions = Array.isArray(value.versions)?value.versions.map((v,i)=>{
      const m=D.validateModel(v?.model);
      if(!m)return null;
      m.id=model.id;
      return {id:string(v.id,100,'version-'+i),name:string(v.name,80,'A saved thought'),
        createdAt:finite(v.createdAt,0),model:m,metadata:metadata(v.metadata||{},m)};
    }).filter(Boolean):[];
    return {model,savedAt:finite(value.savedAt,0),createdAt:finite(value.createdAt,finite(value.savedAt,0)),
      ...metadata(value,model),versions,
      deletedAt:Number.isFinite(value.deletedAt)&&value.deletedAt>0?value.deletedAt:null};
  }
  function hash(text) { let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return (n>>>0).toString(36); }
  D.readDrafts = (strict=false) => {
    const raw=read(KEY.drafts,[],strict);
    if(!Array.isArray(raw)) {
      D.storageIssue='The saved draft collection is not readable. Export your raw data from Settings before making changes.';
      if(strict)throw new Error(D.storageIssue);
      return [];
    }
    const parsed=raw.map(entry);
    if(strict && parsed.some(v=>!v))throw new Error('Some saved drafts are not readable. Download a raw backup in Settings before changing this collection.');
    const ids=new Set();
    return parsed.filter(Boolean).map((item,i)=>{
      if(ids.has(item.model.id))item.model.id+='-legacy-'+i;
      ids.add(item.model.id);return item;
    });
  };
  D.activeDrafts = () => D.readDrafts().filter(d=>!d.deletedAt).sort((a,b)=>b.savedAt-a.savedAt);
  D.trashedDrafts = () => D.readDrafts().filter(d=>d.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt);
  D.getDraft = (id,includeTrash=false) => D.readDrafts().find(d=>d.model.id===id&&(includeTrash||!d.deletedAt))||null;
  D.saveModel = (model, initialMetadata={}) => {
    const validated=D.validateModel(model);
    if(!validated)throw new Error('This flow could not be saved. Keep between 1 and 8 valid steps.');
    const drafts=D.readDrafts(true);
    if(!validated.id)validated.id=D.uid();
    const at=drafts.findIndex(d=>d.model.id===validated.id);
    if(at>=0 && drafts[at].deletedAt)throw new Error('This flow is in Trash. Restore it before saving new changes.');
    const now=Date.now();
    const saved={...(at>=0?drafts[at]:{...metadata(initialMetadata,validated),versions:[],createdAt:now,deletedAt:null}),model:validated,savedAt:now};
    if(at>=0)drafts[at]=saved;else drafts.unshift(saved);
    write(KEY.drafts,drafts);
    return D.copy(saved);
  };
  D.updateDraft = (id,changes) => {
    const drafts=D.readDrafts(true),at=drafts.findIndex(d=>d.model.id===id);
    if(at<0||drafts[at].deletedAt)throw new Error('This flow is no longer available. Return to My Workspace.');
    const current=drafts[at];
    if(changes.model){const m=D.validateModel(changes.model);if(!m)throw new Error('This flow is not valid.');m.id=id;current.model=m;}
    for(const key of ['description','goal','tags','collectionId','notes'])if(Object.hasOwn(changes,key))current[key]=metadata({...current,...changes},current.model)[key];
    current.savedAt=Date.now();write(KEY.drafts,drafts);D.syncSession(current.model);return D.copy(current);
  };
  D.rename = (id,title) => {
    const item=D.getDraft(id);if(!item)throw new Error('This draft is no longer available.');
    item.model.title=String(title).trim().slice(0,60);
    if(!item.model.title)throw new Error('Give the flow a name first.');
    return D.updateDraft(id,{model:item.model});
  };
  D.duplicate = id => {
    const drafts=D.readDrafts(true),source=drafts.find(d=>d.model.id===id&&!d.deletedAt);
    if(!source)throw new Error('This draft is no longer available.');
    const duplicated=D.copy(source),now=Date.now();
    duplicated.model.id=D.uid();duplicated.model.title=(source.model.title.slice(0,53)+' (copy)').slice(0,60);
    duplicated.createdAt=now;duplicated.savedAt=now;duplicated.versions=[];
    drafts.unshift(duplicated);write(KEY.drafts,drafts);return duplicated;
  };
  D.moveToTrash = id => {
    const drafts=D.readDrafts(true),item=drafts.find(d=>d.model.id===id&&!d.deletedAt);
    if(!item)throw new Error('This draft is no longer available.');
    item.deletedAt=Date.now();write(KEY.drafts,drafts);
    try{const current=D.current();if(current?.id===id)sessionStorage.removeItem(KEY.current);}catch{}
  };
  D.restoreDraft = id => {
    const drafts=D.readDrafts(true),item=drafts.find(d=>d.model.id===id&&d.deletedAt);
    if(!item)throw new Error('This deleted flow is no longer available.');
    item.deletedAt=null;item.savedAt=Date.now();
    if(item.collectionId&&!D.collections().some(c=>c.id===item.collectionId))item.collectionId=null;
    write(KEY.drafts,drafts);return item;
  };
  D.deleteForever = id => {
    const drafts=D.readDrafts(true);
    write(KEY.drafts,drafts.filter(d=>!(d.deletedAt&&d.model.id===id)));
  };
  D.emptyTrash = () => write(KEY.drafts,D.readDrafts(true).filter(d=>!d.deletedAt));
  D.purgeExpired = () => {
    const drafts=D.readDrafts(true),now=Date.now(),next=drafts.filter(d=>!d.deletedAt||now-d.deletedAt<30*DAY);
    if(next.length!==drafts.length)write(KEY.drafts,next);
  };
  D.current = () => {try{return D.validateModel(JSON.parse(sessionStorage.getItem(KEY.current)||'null'));}catch{return null;}};
  D.remember = model => {
    try{sessionStorage.setItem(KEY.current,JSON.stringify(model));return true;}
    catch{D.toast('The current flow could not be kept between pages. Save a draft or export before leaving.');return false;}
  };
  D.syncSession = model => {if(D.current()?.id===model.id)D.remember(model);};
  D.collections = (strict=false) => {
    const raw=read(KEY.collections,[],strict);
    if(!Array.isArray(raw)){if(strict)throw new Error('Collections could not be read. Export a raw backup first.');return [];}
    return raw.filter(c=>c&&typeof c.id==='string'&&typeof c.name==='string').map(c=>({id:c.id.slice(0,100),name:c.name.slice(0,60),description:string(c.description,1000),createdAt:finite(c.createdAt,0)}));
  };
  D.saveCollection = (value,id=null) => {
    const list=D.collections(true),name=String(value.name||'').trim().slice(0,60);
    if(!name)throw new Error('Give the collection a name first.');
    const existing=list.find(c=>c.id===id);
    if(id&&!existing)throw new Error('This collection is no longer available.');
    const result={id:existing?.id||D.uid(),name,description:String(value.description||'').trim().slice(0,1000),createdAt:existing?.createdAt||Date.now()};
    if(existing)list[list.indexOf(existing)]=result;else list.unshift(result);
    write(KEY.collections,list);return result;
  };
  D.removeCollection = id => {
    const collections=D.collections(true).filter(c=>c.id!==id),drafts=D.readDrafts(true);
    for(const item of drafts)if(item.collectionId===id)item.collectionId=null;
    transaction([[KEY.collections,collections],[KEY.drafts,drafts]]);
  };
  D.assignCollection = (ids,collectionId) => {
    if(collectionId&&!D.collections(true).some(c=>c.id===collectionId))throw new Error('This collection is no longer available.');
    const drafts=D.readDrafts(true),wanted=new Set(ids);
    for(const item of drafts)if(wanted.has(item.model.id)&&!item.deletedAt)item.collectionId=collectionId;
    write(KEY.drafts,drafts);
  };
  D.preferences = () => {
    const p=read(KEY.preferences,{});
    return {style:p?.style==='clean'?'clean':'sketch',grid:p?.grid!==false,color:Object.hasOwn(D.colors,p?.color)?p.color:'lilac',view:p?.view==='list'?'list':'grid'};
  };
  D.savePreferences = value => {
    const old=D.preferences(),p={...old,...value};
    const clean={style:p.style==='clean'?'clean':'sketch',grid:p.grid!==false,color:Object.hasOwn(D.colors,p.color)?p.color:'lilac',view:p.view==='list'?'list':'grid'};
    write(KEY.preferences,clean);return clean;
  };
  function snapshot(item,name) {
    return {id:D.uid(),name:String(name||'A saved thought').trim().slice(0,80),createdAt:Date.now(),model:D.copy(item.model),metadata:metadata(item,item.model)};
  }
  D.saveVersion = (id,name) => {
    const drafts=D.readDrafts(true),item=drafts.find(d=>d.model.id===id&&!d.deletedAt);
    if(!item)throw new Error('This flow is no longer available.');
    const v=snapshot(item,name);item.versions.unshift(v);item.savedAt=Date.now();write(KEY.drafts,drafts);return v;
  };
  D.restoreVersion = (id,versionId) => {
    const drafts=D.readDrafts(true),item=drafts.find(d=>d.model.id===id&&!d.deletedAt),version=item?.versions.find(v=>v.id===versionId);
    if(!version)throw new Error('This version is no longer available.');
    const before=snapshot(item,'Before restoring '+version.name);
    item.model=D.copy(version.model);item.model.id=id;
    Object.assign(item,metadata(version.metadata,item.model));item.savedAt=Date.now();
    if(item.collectionId&&!D.collections().some(c=>c.id===item.collectionId))item.collectionId=null;
    const restored=snapshot(item,'Restored: '+version.name);
    item.versions.unshift(restored,before);write(KEY.drafts,drafts);D.syncSession(item.model);return restored;
  };
  D.diff = (before,after) => {
    const changes=[],a=new Map(before.nodes.map(n=>[n.id,n])),b=new Map(after.nodes.map(n=>[n.id,n]));
    for(const [id,node] of b)if(!a.has(id))changes.push({kind:'added',text:'Added step: '+node.label,id});
    for(const [id,node] of a)if(!b.has(id))changes.push({kind:'removed',text:'Removed step: '+node.label,id});
    for(const [id,node] of b){
      const old=a.get(id);if(!old)continue;
      if(old.label!==node.label)changes.push({kind:'changed',text:'“'+old.label+'” became “'+node.label+'”.',id});
      if(old.color!==node.color||old.shape!==node.shape)changes.push({kind:'changed',text:'Updated the appearance of '+node.label+'.',id});
      if(Math.abs(old.x-node.x)>1||Math.abs(old.y-node.y)>1)changes.push({kind:'changed',text:'Moved '+node.label+'.',id});
    }
    const edgeKey=e=>e.from+'→'+e.to+':'+(e.label||'');
    const oldEdges=new Set(before.edges.map(edgeKey)),newEdges=new Set(after.edges.map(edgeKey));
    if([...oldEdges].some(e=>!newEdges.has(e))||[...newEdges].some(e=>!oldEdges.has(e)))changes.push({kind:'changed',text:'Updated the connections between steps.'});
    if(before.title!==after.title)changes.push({kind:'changed',text:'Renamed the flow to “'+after.title+'”.'});
    if(before.style!==after.style)changes.push({kind:'changed',text:'Changed the flow style to '+after.style+'.'});
    return changes;
  };
  D.makeBackup = () => ({format:'draftline-backup',version:1,exportedAt:new Date().toISOString(),drafts:D.readDrafts(true),collections:D.collections(true),preferences:D.preferences()});
  D.reviewBackup = data => {
    if(!data||data.format!=='draftline-backup'||data.version!==1||!Array.isArray(data.drafts)||!Array.isArray(data.collections))throw new Error('Choose a Draftline backup JSON file. SVG, PDF and image exports are not editable backups.');
    if(data.drafts.length>1000||data.collections.length>500)throw new Error('This backup is too large to import in one go.');
    const drafts=data.drafts.map(entry);
    if(drafts.some(d=>!d))throw new Error('This backup contains an invalid flow. No data has been imported.');
    const collections=data.collections.map(c=>{
      if(!c||typeof c.id!=='string'||typeof c.name!=='string'||!c.name.trim())throw new Error('This backup contains an invalid collection.');
      return {id:c.id,name:c.name.slice(0,60),description:string(c.description,1000),createdAt:finite(c.createdAt,Date.now())};
    });
    if(new Set(drafts.map(d=>d.model.id)).size!==drafts.length||new Set(collections.map(c=>c.id)).size!==collections.length)throw new Error('This backup has duplicate identifiers. No data has been imported.');
    return {drafts,collections,versions:drafts.reduce((n,d)=>n+d.versions.length,0),trash:drafts.filter(d=>d.deletedAt).length};
  };
  D.importBackup = reviewed => {
    const existing=D.readDrafts(true),collections=D.collections(true),mapping=new Map(),now=Date.now();
    for(const old of reviewed.collections){const c=D.copy(old);c.id=D.uid();c.name=(c.name.slice(0,51)+' (imported)').slice(0,60);mapping.set(old.id,c.id);collections.push(c);}
    const imported=reviewed.drafts.map(old=>{
      const item=D.copy(old);item.model.id=D.uid();item.model.title=(item.model.title.slice(0,51)+' (imported)').slice(0,60);
      item.collectionId=mapping.get(old.collectionId)||null;item.createdAt=now;item.savedAt=now;
      if(item.deletedAt)item.deletedAt=now;
      for(const v of item.versions){v.id=D.uid();v.model.id=item.model.id;v.metadata.collectionId=mapping.get(v.metadata.collectionId)||null;}
      return item;
    });
    transaction([[KEY.collections,collections],[KEY.drafts,[...imported,...existing]]]);
    return imported.length;
  };
  D.rawBackup = () => {
    const result={format:'draftline-raw-recovery',exportedAt:new Date().toISOString(),storage:{}};
    for(const key of Object.values(KEY))if(key!==KEY.current)try{result.storage[key]=localStorage.getItem(key);}catch{result.storage[key]='Storage unavailable';}
    return result;
  };
  D.templates = {
    onboarding:{category:'Onboarding',title:'The first little win',description:'Give a new visitor a small, satisfying first success.',steps:['Discover Draftline','Try a sample','Make it yours','Save a first draft'],tips:['Start with one useful result.','Let the visitor try before committing.','Keep the first saved draft easy to find.']},
    checkout:{category:'Checkout',title:'From found to favorite',description:'Map the path from a good find to a finished order.',steps:['Find a favorite','A closer look','Add to basket','A quick checkout','Something to look forward to'],tips:['Make the next action clear.','Keep totals and delivery details visible.','End with a helpful confirmation.']},
    support:{category:'Support',title:'A little help, please',description:'Find a friendlier way from a question to an answer.',steps:['Ask a question','Find an answer','Still stuck?','Talk to a person','A little clearer'],tips:['Name the question before the channel.','Give self-service a useful next step.','Make it easy to reach a person.']},
    approval:{category:'Approval',title:'A thoughtful approval',description:'A clear route from request to decision, with room to make it better.',steps:['Send request','Review','Approved?','Revise','Move forward'],tips:['Name who reviews the request.','Decide what approval means.','Add context to the revision step.']}
  };
  D.linearScene = (labels,title,style=D.preferences().style) => {
    const count=labels.length,gap=count>6?18:38,w=Math.min(180,(1020-gap*(count-1))/count),total=count*w+gap*(count-1),left=(1100-total)/2;
    return {id:null,title,style,nodes:labels.map((label,i)=>({id:'n'+(i+1),label,x:left+i*(w+gap),y:label.includes('?')?135:150,w,h:label.includes('?')?110:68,color:i===0?'peach':D.preferences().color,shape:label.includes('?')?'decision':i===0?'start':'step'})),edges:labels.slice(1).map((_,i)=>({from:'n'+(i+1),to:'n'+(i+2)}))};
  };
  D.newModel = () => ({id:null,title:'A new thought',style:D.preferences().style,nodes:[{id:'n1',label:'A new idea',x:460,y:150,w:180,h:68,color:D.preferences().color,shape:'start'}],edges:[]});
  D.templateModel = (key,style=D.preferences().style) => {
    const template=Object.hasOwn(D.templates,key)?D.templates[key]:null;if(!template)return null;
    const model=D.linearScene(template.steps,template.title,style);
    const palette=['peach','lilac','blue','green','yellow'];model.nodes.forEach((n,i)=>n.color=palette[i%5]);
    if(key==='approval'){
      model.nodes=[
        {id:'n1',label:'Send request',x:30,y:155,w:140,h:64,color:'lilac',shape:'start'},
        {id:'n2',label:'Review',x:245,y:155,w:160,h:64,color:'blue',shape:'step'},
        {id:'n3',label:'Approved?',x:475,y:130,w:190,h:114,color:'yellow',shape:'decision'},
        {id:'n4',label:'Revise',x:800,y:265,w:180,h:64,color:'peach',shape:'step'},
        {id:'n5',label:'Move forward',x:800,y:45,w:180,h:64,color:'green',shape:'step'}
      ];
      model.edges=[{from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n3',to:'n5',label:'Yes'},{from:'n3',to:'n4',label:'No'},{from:'n4',to:'n2'}];
    }
    return model;
  };
  D.createFromTemplate = (key,collectionId=null) => {
    const model=D.templateModel(key);if(!model)throw new Error('This template could not be found.');
    const item=D.saveModel(model,{tags:[D.templates[key].category],collectionId:collectionId&&D.collections().some(c=>c.id===collectionId)?collectionId:null});
    return item;
  };
  const measure=document.createElement('canvas').getContext('2d');
  function wrap(text,width,font) {
    measure.font=font;const lines=[];let line='';
    for(const word of String(text).split(/\s+/)){
      if(measure.measureText((line?line+' ':'')+word).width<=width){line+=(line?' ':'')+word;continue;}
      if(line){lines.push(line);line='';}
      if(measure.measureText(word).width<=width){line=word;continue;}
      for(const char of Array.from(word)){if(measure.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}
    }
    if(line)lines.push(line);return lines.length?lines:[''];
  }
  D.labelLayout = (node,style) => {
    const family=style==='clean'?'Inter':'Caveat',start=style==='clean'?14:25;
    for(let size=start;size>=4;size--){
      const lineHeight=size*(style==='clean'?1.3:1.05),font='600 '+size+'px '+family;
      for(let count=1;count<=6;count++){
        const blockHeight=size*1.35+(count-1)*lineHeight;
        const width=node.shape==='decision'?node.w*(1-(blockHeight+12)/node.h)-18:node.w-18;
        if(width<10||blockHeight>node.h-12)continue;
        const lines=wrap(node.label,width,font);
        if(lines.length<=count)return {lines,size,lineHeight,family,font};
      }
    }
    return {lines:wrap(node.label,node.w*.38,'600 9px '+family),size:9,lineHeight:10,family,font:'600 9px '+family};
  };
  D.nodeShape = (node,style) => {
    const w=node.w,h=node.h;
    if(node.shape==='decision')return 'M'+w/2+' 0L'+w+' '+h/2+'L'+w/2+' '+h+'L0 '+h/2+'Z';
    if(node.shape==='step'&&style==='sketch')return 'M8 2Q'+(w*.45)+' -1 '+(w-7)+' 3Q'+(w+1)+' 4 '+(w-1)+' 13L'+(w-2)+' '+(h-9)+'Q'+(w-2)+' '+(h+1)+' '+(w-13)+' '+(h-1)+'L9 '+(h-2)+'Q0 '+(h-2)+' 2 '+(h-12)+'L1 10Q1 1 8 2Z';
    const r=node.shape==='start'?h/2:style==='clean'?8:7;
    return 'M'+r+' 1H'+(w-r)+'Q'+(w-1)+' 1 '+(w-1)+' '+r+'V'+(h-r)+'Q'+(w-1)+' '+(h-1)+' '+(w-r)+' '+(h-1)+'H'+r+'Q1 '+(h-1)+' 1 '+(h-r)+'V'+r+'Q1 1 '+r+' 1Z';
  };
  D.edgeGeometry = (model,edge) => {
    const a=model.nodes.find(n=>n.id===edge.from),b=model.nodes.find(n=>n.id===edge.to);
    if(!a||!b)return null;
    if(b.x<=a.x){
      const x1=a.x+a.w/2,y1=a.y+a.h,x2=b.x+b.w/2,y2=b.y+b.h+3,y=Math.min(370,Math.max(y1,y2)+28);
      return {d:'M'+x1+' '+y1+'V'+y+'H'+x2+'V'+y2,end:{x:x2,y:y2,angle:-Math.PI/2},label:{x:(x1+x2)/2,y:y-8}};
    }
    const x1=a.x+a.w+2,y1=a.y+a.h/2,x2=b.x-4,y2=b.y+b.h/2,bend=Math.max(28,(x2-x1)*.46);
    return {d:'M'+x1+' '+y1+'C'+(x1+bend)+' '+y1+' '+(x2-bend)+' '+y2+' '+x2+' '+y2,
      end:{x:x2,y:y2,angle:0},label:{x:x1+(x2-x1)*.56,y:y1+(y2-y1)*.7-13}};
  };
  D.edgeMarkup = (model,marker='flow-arrow') => model.edges.map(edge=>{
    const p=D.edgeGeometry(model,edge);if(!p)return '';
    return '<path class="flow-edge" d="'+p.d+'" marker-end="url(#'+marker+')" fill="none" stroke="#292723" stroke-width="1.7" stroke-linecap="round"/>'+
      (edge.label?'<text class="edge-label" x="'+p.label.x+'" y="'+p.label.y+'" text-anchor="middle" style="font-family:Inter;font-size:13px;fill:#77736d">'+D.escape(edge.label)+'</text>':'');
  }).join('');
  D.sceneMarkup = (model,options={}) => {
    const marker=options.marker||'flow-arrow',interactive=!!options.interactive;
    const definitions='<defs><marker id="'+marker+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#292723" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    return '<title>'+D.escape(model.title)+'</title>'+definitions+'<g class="edges">'+D.edgeMarkup(model,marker)+'</g><g class="nodes">'+model.nodes.map(node=>{
      const layout=D.labelLayout(node,model.style),firstY=node.h/2-(layout.lines.length-1)*layout.lineHeight/2;
      const interactiveProps=interactive?' role="button" tabindex="0" aria-label="Edit step: '+D.escape(node.label)+'"':'';
      const highlight=options.changed?.includes(node.id)?'<rect x="-5" y="-5" width="'+(node.w+10)+'" height="'+(node.h+10)+'" rx="11" fill="none" stroke="#d95b35" stroke-width="2" stroke-dasharray="5 4"/>':'';
      return '<g class="flow-node" data-id="'+D.escape(node.id)+'" transform="translate('+node.x+' '+node.y+')"'+interactiveProps+'><path class="node-outline" d="'+D.nodeShape(node,model.style)+'" fill="'+D.colors[node.color]+'" stroke="#292723" stroke-width="1.7"/>'+highlight+
        (options.selected===node.id?'<rect x="-5" y="-5" width="'+(node.w+10)+'" height="'+(node.h+10)+'" rx="10" fill="none" stroke="#d95b35" stroke-dasharray="4 4"/>':'')+
        '<text class="node-label" data-shape="'+node.shape+'" text-anchor="middle" dominant-baseline="central" style="font-family:'+layout.family+';font-size:'+layout.size+'px;font-weight:600;fill:#171717;pointer-events:none">'+layout.lines.map((line,i)=>'<tspan x="'+node.w/2+'" y="'+(firstY+i*layout.lineHeight)+'">'+D.escape(line)+'</tspan>').join('')+'</text></g>';
    }).join('')+'</g>';
  };
  D.svg = (model,options={}) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 380" class="flow-preview-svg" role="img" aria-label="'+D.escape(model.title)+'">'+D.sceneMarkup(model,{...options,marker:options.marker||'arrow-'+D.uid()})+'</svg>';
  D.download = (blob,name) => {
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  D.filename = title => String(title).toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'a-clearer-path';
  const fontCache={};
  D.exportSvg = async (model,background='paper') => {
    await document.fonts.ready;
    const family=model.style==='clean'?'Inter':'Caveat',file=family==='Inter'?'inter-600.ttf':'caveat-600.ttf';
    if(!fontCache[file]){
      const response=await fetch('assets/fonts/'+file);if(!response.ok)throw new Error('The local export font could not be loaded.');
      const buffer=await response.arrayBuffer();let binary='';for(const value of new Uint8Array(buffer))binary+=String.fromCharCode(value);
      fontCache[file]=btoa(binary);
    }
    const fill=background==='transparent'?'':background==='white'?'<rect width="1100" height="380" fill="#ffffff"/>':'<defs><pattern id="paper-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="#e6e3dc"/></pattern></defs><rect width="1100" height="380" fill="#fffefb"/><rect width="1100" height="380" fill="url(#paper-dots)"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="380" viewBox="0 0 1100 380"><style>@font-face{font-family:'+family+';src:url(data:font/ttf;base64,'+fontCache[file]+') format("truetype");font-weight:600}</style>'+fill+D.sceneMarkup(model,{marker:'export-arrow'})+'</svg>';
  };
  D.rasterize = async (model,background='paper',scale=2) => {
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1100*scale;canvas.height=380*scale;
    const c=canvas.getContext('2d');c.scale(scale,scale);
    if(background!=='transparent'){c.fillStyle=background==='white'?'#ffffff':'#fffefb';c.fillRect(0,0,1100,380);}
    if(background==='paper'){c.fillStyle='#e6e3dc';for(let x=12;x<1100;x+=24)for(let y=12;y<380;y+=24){c.beginPath();c.arc(x,y,1,0,Math.PI*2);c.fill();}}
    for(const edge of model.edges){
      const p=D.edgeGeometry(model,edge);if(!p)continue;
      c.strokeStyle='#292723';c.lineWidth=1.7;c.lineCap='round';c.stroke(new Path2D(p.d));
      c.save();c.translate(p.end.x,p.end.y);c.rotate(p.end.angle);c.beginPath();c.moveTo(-7,-4);c.lineTo(0,0);c.lineTo(-7,4);c.stroke();c.restore();
      if(edge.label){c.font='400 13px Inter';c.textAlign='center';c.fillStyle='#77736d';c.fillText(edge.label,p.label.x,p.label.y);}
    }
    for(const node of model.nodes){
      c.save();c.translate(node.x,node.y);c.fillStyle=D.colors[node.color];c.strokeStyle='#292723';c.lineWidth=1.7;
      const path=new Path2D(D.nodeShape(node,model.style));c.fill(path);c.stroke(path);
      const layout=D.labelLayout(node,model.style),firstY=node.h/2-(layout.lines.length-1)*layout.lineHeight/2;
      c.font=layout.font;c.fillStyle='#171717';c.textAlign='center';c.textBaseline='middle';
      layout.lines.forEach((line,i)=>c.fillText(line,node.w/2,firstY+i*layout.lineHeight));c.restore();
    }
    return canvas;
  };
  D.pdf = async (model,background='paper') => {
    const canvas=await D.rasterize(model,background==='transparent'?'white':background,2);
    const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]),c=>c.charCodeAt(0));
    const encode=s=>new TextEncoder().encode(s),chunks=[],offsets=[0];let length=0;
    const push=data=>{const bytes=typeof data==='string'?encode(data):data;chunks.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;push(id+' 0 obj\n'+body+'\nendobj\n');};
    push('%PDF-1.4\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Flow 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=length;push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');push(jpeg);push('\nendstream\nendobj\n');
    const drawing='q\n786 0 0 271.527 28 161.736 cm\n/Flow Do\nQ\n';object(5,'<< /Length '+encode(drawing).length+' >>\nstream\n'+drawing+'endstream');
    const start=length;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
    return new Blob(chunks,{type:'application/pdf'});
  };
  let toastTimer;
  D.toast = message => {
    let el=document.getElementById('toast');
    if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.append(el);}
    el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),4500);
  };
  D.date = value => value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(value):'Date unavailable';
  D.dateTime = value => value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(value):'Date unavailable';
  D.dirty=false;
  D.setDirty = value => {D.dirty=!!value;};
  window.addEventListener('beforeunload',event=>{if(D.dirty){event.preventDefault();event.returnValue='';}});
})();
