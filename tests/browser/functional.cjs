const {chromium}=require(process.env.DRAFTLINE_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('assert/strict');
const fs=require('fs');
const path=require('path');
const origin=process.env.DRAFTLINE_BASE_URL || 'http://localhost:8096/';
const output=process.env.DRAFTLINE_TEST_OUTPUT || path.resolve(__dirname,'../../test-results');
fs.mkdirSync(output,{recursive:true});
let browser,context,page,checks=0;
const errors=[],results=[];
async function check(name,fn){await fn();checks++;results.push({name,pass:true});console.log('PASS',name);}
async function goto(route){
  const response=await page.goto(origin+route);assert.equal(response.status(),200);
  if(!route.startsWith('canvas')&&route!=='')await page.waitForSelector('#page-content[aria-busy="false"]');
  await page.evaluate(()=>document.fonts.ready);
}
async function data(){return page.evaluate(()=>JSON.parse(localStorage.getItem('draftline.drafts.v1')||'[]'));}
async function submitDialog(){await page.locator('#action-submit').click();await page.waitForSelector('#action-dialog[open]',{state:'hidden'});}
async function menu(id,command){const card=page.locator('.draft-card').filter({has:page.locator('[data-id="'+id+'"][data-cmd="'+command+'"]')});await card.locator('summary').click();await card.locator('[data-cmd="'+command+'"]').click();}
async function download(button,name){
  const event=page.waitForEvent('download');await button.click();const file=await event;
  const target=path.join(output,name||file.suggestedFilename());await file.saveAs(target);return {target,suggested:file.suggestedFilename(),bytes:fs.readFileSync(target)};
}
(async()=>{
  browser=await chromium.launch({headless:true,...(process.env.DRAFTLINE_BROWSER_CHANNEL?{channel:process.env.DRAFTLINE_BROWSER_CHANNEL}:{})});
  context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
  page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('dialog',dialog=>dialog.accept());
  await check('Fresh workspace has a genuine empty state',async()=>{
    await goto('workspace.php');assert.equal(await page.locator('.draft-card').count(),0);
    assert.match(await page.locator('.empty-state h2').textContent(),/rough thought/);
  });
  let firstId,legacyId='legacy-flow-201',approvalId,collectionId,savedVersion;
  const legacy={model:{id:legacyId,title:'A legacy flow',style:'sketch',nodes:[
    {id:'n1',label:'An existing beginning',x:110,y:150,w:170,h:68,color:'peach',shape:'start'},
    {id:'n2',label:'An existing next step',x:420,y:150,w:180,h:68,color:'lilac',shape:'step'},
    {id:'n3',label:'A little clearer',x:770,y:150,w:180,h:68,color:'green',shape:'step'}
  ],edges:[{from:'n1',to:'n2'},{from:'n2',to:'n3'}]},savedAt:Date.now()-10000};
  await check('New flow, outline, rename and Save draft work in the original canvas',async()=>{
    await page.locator('.hero-actions a[href="canvas.php?new=1"]').click();await page.waitForSelector('#flow-canvas .flow-node');
    assert.equal(await page.locator('#flow-canvas .flow-node').count(),1);
    await page.locator('#outline').fill('Arrive → Explore → A first win');await page.locator('#outline-form button[type="submit"]').click();
    assert.equal(await page.locator('#flow-canvas .flow-node').count(),3);
    await page.locator('.project-name').click();await page.locator('#draft-name').fill('Our first small flow');await page.locator('#rename-form button').click();
    await page.locator('[data-action="save"]').click();
    const drafts=await data();assert.equal(drafts.length,1);firstId=drafts[0].model.id;
    assert.equal(drafts[0].model.title,'Our first small flow');assert.equal(drafts[0].model.nodes[1].label,'Explore');
  });
  await check('Existing v1 localStorage drafts open without losing nodes, edges or coordinates',async()=>{
    await page.evaluate(item=>{const data=JSON.parse(localStorage.getItem('draftline.drafts.v1'));data.push(item);localStorage.setItem('draftline.drafts.v1',JSON.stringify(data));},legacy);
    await goto('workspace.php');assert.equal(await page.locator('.draft-card').count(),2);
    await page.locator('.card-title-row h3 a').filter({hasText:'A legacy flow'}).click();await page.waitForSelector('#flow-canvas .flow-node');
    const model=await page.evaluate(()=>window.Draftline.editor.getModel());assert.deepEqual(model,legacy.model);
  });
  await check('Grid/List and name search persist and have a no-results state',async()=>{
    await goto('workspace.php');await page.locator('[data-cmd="view-list"]').click();assert.equal(await page.locator('.draft-list-row').count(),2);
    await page.reload();await page.waitForSelector('.draft-list-row');assert.equal(await page.locator('[data-cmd="view-list"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-filter="drafts"]').fill('legacy');assert.equal(await page.locator('.draft-list-row').count(),1);
    await page.locator('[data-filter="drafts"]').fill('nothing matches this');assert.match(await page.locator('#draft-results').textContent(),/No flows match/);
    await page.locator('[data-cmd="clear-search"]').click();await page.locator('[data-cmd="view-grid"]').click();assert.equal(await page.locator('.draft-card').count(),2);
  });
  await check('Workspace rename cancel and save, and duplication, preserve the source',async()=>{
    await menu(firstId,'rename-flow');await page.locator('#rename-flow-name').fill('Discard this rename');await page.locator('#action-dialog [data-dismiss-dialog]').first().click();
    assert.equal((await data()).find(d=>d.model.id===firstId).model.title,'Our first small flow');
    await menu(firstId,'rename-flow');await page.locator('#rename-flow-name').fill('A renamed thought');await submitDialog();
    await menu(firstId,'duplicate-flow');const drafts=await data(),source=drafts.find(d=>d.model.id===firstId),copy=drafts.find(d=>d.model.title==='A renamed thought (copy)');
    assert.ok(copy);assert.notEqual(copy.model.id,source.model.id);assert.deepEqual(copy.model.nodes,source.model.nodes);
  });
  await check('All four template categories filter correctly and Approval creates a branched flow',async()=>{
    await goto('templates.php');assert.equal(await page.locator('.template-choice').count(),4);
    for(const category of ['Onboarding','Checkout','Support','Approval']){
      await page.locator('[data-category="'+category+'"]').click();assert.equal(await page.locator('.template-choice').count(),1);
      assert.equal((await page.locator('.category-label').first().textContent()).toLowerCase(),category.toLowerCase());
    }
    await page.locator('.template-choice .text-link').click();await page.waitForSelector('[data-cmd="use-template"]');
    assert.equal(await page.locator('.step-guide li').count(),5);
    const typography=await page.evaluate(()=>{
      const node=[...document.querySelectorAll('.detail-diagram .flow-node')].find(n=>n.textContent.includes('Approved?'));
      const text=node.querySelector('text');return {family:getComputedStyle(text).fontFamily,lines:text.children.length};
    });assert.match(typography.family,/Caveat/);assert.equal(typography.lines,1);
    await page.locator('[data-cmd="use-template"]').click();await page.waitForSelector('#flow-canvas .flow-node');
    const model=await page.evaluate(()=>window.Draftline.editor.getModel());approvalId=model.id;
    assert.equal(model.nodes.length,5);assert.equal(model.edges.length,5);assert.ok(model.edges.some(e=>e.label==='Yes'));assert.ok(model.edges.some(e=>e.from==='n4'&&e.to==='n2'));
  });
  await check('Original canvas still edits and drags nodes, switches style, undoes and saves',async()=>{
    await goto('canvas.php?id='+legacyId);await page.locator('#flow-canvas [data-id="n2"]').click();
    await page.locator('#step-name').fill('An edited next step');await page.locator('[data-color="blue"]').click();await page.locator('#edit-form button[type="submit"]').click();
    let model=await page.evaluate(()=>window.Draftline.editor.getModel());assert.equal(model.nodes[1].label,'An edited next step');assert.equal(model.nodes[1].color,'blue');
    const node=page.locator('#flow-canvas [data-id="n2"]'),b=await node.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+45,b.y+b.height/2+20,{steps:5});await page.mouse.up();
    model=await page.evaluate(()=>window.Draftline.editor.getModel());assert.ok(model.nodes[1].x>legacy.model.nodes[1].x);
    await page.locator('[data-action="undo"]').click();model=await page.evaluate(()=>window.Draftline.editor.getModel());assert.equal(model.nodes[1].x,legacy.model.nodes[1].x);
    await page.locator('[data-style="clean"]').click();assert.equal(await page.locator('[data-style="clean"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-style="sketch"]').click();await page.locator('[data-action="save"]').click();
    assert.equal((await data()).find(d=>d.model.id===legacyId).model.nodes[1].label,'An edited next step');
  });
  await check('Collections create, group and remove flows without deleting them',async()=>{
    await goto('collections.php');await page.locator('.hero-actions [data-cmd="create-collection"]').click();
    await page.locator('#collection-name').fill('Website refresh');await page.locator('#collection-description').fill('The moments around a first order.');await submitDialog();
    collectionId=await page.evaluate(()=>window.Draftline.collections()[0].id);
    await page.locator('.collection-toolbar [data-cmd="add-to-collection"]').click();
    await page.locator('input[name="flows"][value="'+legacyId+'"]').check();await page.locator('input[name="flows"][value="'+approvalId+'"]').check();await submitDialog();
    assert.equal(await page.locator('.collection-grid .draft-card').count(),2);
    const card=page.locator('.draft-card').filter({has:page.locator('[data-cmd="remove-from-collection"][data-id="'+legacyId+'"]')});
    await card.locator('summary').click();await card.locator('[data-cmd="remove-from-collection"]').click();assert.equal(await page.locator('.collection-grid .draft-card').count(),1);
    assert.ok((await data()).some(d=>d.model.id===legacyId&&!d.deletedAt));
  });
  await check('Flow details save description, goal, tags and collection alongside the old model',async()=>{
    await goto('flow.php?id='+approvalId);
    await page.locator('#flow-description').fill('A thoughtful review before the next step.');
    await page.locator('#flow-goal').fill('Make the decision and revision path clear.');
    await page.locator('#new-tag').fill('Product');await page.locator('#new-tag').press('Enter');
    await page.locator('#flow-collection').selectOption(collectionId);
    await page.locator('form[data-form="flow-details"] button[type="submit"]').click();
    const item=(await data()).find(d=>d.model.id===approvalId);
    assert.equal(item.description,'A thoughtful review before the next step.');assert.equal(item.goal,'Make the decision and revision path clear.');assert.ok(item.tags.includes('Product'));assert.equal(item.collectionId,collectionId);assert.equal(item.model.edges.length,5);
  });
  await check('Presentation has per-step notes, keyboard navigation and persistent notes',async()=>{
    await goto('present.php?id='+approvalId);
    assert.equal(await page.locator('[data-cmd="previous-step"]').isDisabled(),true);
    await page.locator('#speaker-notes').fill('Bring the request and a little context.');await page.waitForFunction(()=>document.querySelector('#note-status').textContent.startsWith('✓'));
    await page.locator('[data-cmd="next-step"]').click();await page.locator('#speaker-notes').fill('Explain who reviews the request.');await page.waitForFunction(()=>document.querySelector('#note-status').textContent.startsWith('✓'));
    await page.locator('h1').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.presentation-focus h2').textContent(),'Approved?');
    await page.locator('[data-cmd="toggle-notes"]').click();assert.equal(await page.locator('#speaker-notes').count(),0);
    await page.locator('[data-cmd="toggle-notes"]').click();await page.reload();await page.waitForSelector('#speaker-notes');assert.equal(await page.locator('#speaker-notes').inputValue(),'Bring the request and a little context.');
    assert.equal((await data()).find(d=>d.model.id===approvalId).notes.n2,'Explain who reviews the request.');
  });
  await check('Named versions show actual changes and restore both content and metadata',async()=>{
    await goto('history.php?id='+approvalId);await page.locator('[data-cmd="save-version"]').first().click();await page.locator('#version-name').fill('Before the review changed');await submitDialog();
    savedVersion=(await data()).find(d=>d.model.id===approvalId).versions[0].id;
    await goto('canvas.php?id='+approvalId);await page.locator('#flow-canvas [data-id="n2"]').click();await page.locator('#step-name').fill('Review the new details');await page.locator('#edit-form button[type="submit"]').click();await page.locator('[data-action="save"]').click();
    await page.evaluate(id=>window.Draftline.updateDraft(id,{goal:'A changed goal'}),approvalId);
    await goto('history.php?id='+approvalId+'&version='+savedVersion);assert.match(await page.locator('.change-list').textContent(),/Review the new details/);assert.match(await page.locator('.change-list').textContent(),/objective/);
    await page.locator('[data-cmd="restore-version"]').click();await page.locator('#action-dialog [data-dismiss-dialog]').first().click();assert.equal((await data()).find(d=>d.model.id===approvalId).model.nodes[1].label,'Review the new details');
    await page.locator('[data-cmd="restore-version"]').click();await submitDialog();
    const restored=(await data()).find(d=>d.model.id===approvalId);assert.equal(restored.model.nodes[1].label,'Review');assert.equal(restored.goal,'Make the decision and revision path clear.');assert.ok(restored.versions.some(v=>v.id===savedVersion));assert.equal(restored.versions.length,3);
  });
  await check('Decision typography matches Sketch/Clean nodes and long labels fit inside diagonal edges',async()=>{
    const results=await page.evaluate(async()=>{
      const D=window.Draftline;await document.fonts.load('600 25px Caveat');await document.fonts.load('600 14px Inter');
      const failures=[],samples=['Approved?','What happens next?','ExtraordinarilyLongUnbrokenQuestionMark????','A very long decision about the next moment?'];
      for(const style of ['sketch','clean'])for(const width of [190,110])for(const label of samples){
        const model=D.templateModel('approval',style),node=model.nodes.find(n=>n.shape==='decision');
        node.w=width;node.h=width===110?90:114;node.label=label.slice(0,42);
        const holder=document.createElement('div');holder.style.cssText='position:absolute;left:-2000px;width:1100px';holder.innerHTML=D.svg(model);document.body.append(holder);
        const text=holder.querySelector('[data-shape="decision"]'),b=text.getBBox(),family=getComputedStyle(text).fontFamily;let ratio=0;
        for(const x of [b.x,b.x+b.width])for(const y of [b.y,b.y+b.height])ratio=Math.max(ratio,Math.abs(x-node.w/2)/(node.w/2)+Math.abs(y-node.h/2)/(node.h/2));
        if(ratio>=1||!family.includes(style==='sketch'?'Caveat':'Inter'))failures.push({style,width,label,ratio,family});
        if(label==='Approved?'&&width===190){
          const review=holder.querySelector('[data-id="n2"] text');
          if(text.children.length!==1||getComputedStyle(text).fontSize!==getComputedStyle(review).fontSize)failures.push({style,label,reason:'Question must match neighboring typography and stay on one line'});
        }
        holder.remove();
      }
      return failures;
    });assert.deepEqual(results,[]);
  });
  await check('PNG, embedded-font SVG and valid PDF downloads are created locally',async()=>{
    await goto('export.php?id='+approvalId);
    await page.locator('input[name="export-background"][value="transparent"]').check();
    const png=await download(page.locator('[data-cmd="download-export"]'),'approval-transparent.png');
    assert.equal(png.bytes.readUInt32BE(16),2200);assert.equal(png.bytes.readUInt32BE(20),760);
    const alpha=await page.evaluate(async b64=>{const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return x.getImageData(0,0,1,1).data[3];},png.bytes.toString('base64'));assert.equal(alpha,0);
    await page.locator('[data-format="svg"]').click();const svg=await download(page.locator('[data-cmd="download-export"]'),'approval.svg');const markup=svg.bytes.toString();assert.match(markup,/data:font\/ttf;base64/);assert.match(markup,/font-family:Caveat/);assert.match(markup,/Approved\?/);
    await page.locator('[data-format="pdf"]').click();assert.equal(await page.locator('input[value="transparent"]').isDisabled(),true);
    const pdf=await download(page.locator('[data-cmd="download-export"]'),'approval.pdf');assert.equal(pdf.bytes.subarray(0,8).toString(),'%PDF-1.4');
    const text=pdf.bytes.toString('latin1'),xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.bytes.subarray(xref,xref+4).toString(),'xref');assert.ok(pdf.bytes.length>10000);
  });
  await check('Trash cancel, move, restore and permanent-delete confirmations preserve data',async()=>{
    await goto('workspace.php');await menu(approvalId,'trash-flow');await page.locator('#action-dialog [data-dismiss-dialog]').first().click();assert.ok(!(await data()).find(d=>d.model.id===approvalId).deletedAt);
    await menu(approvalId,'trash-flow');await submitDialog();assert.ok((await data()).find(d=>d.model.id===approvalId).deletedAt);
    await goto('trash.php');assert.equal(await page.locator('.trash-row').count(),1);await page.locator('[data-cmd="delete-forever"]').click();await page.locator('#action-dialog [data-dismiss-dialog]').first().click();assert.ok((await data()).some(d=>d.model.id===approvalId));
    await page.locator('[data-cmd="restore-trash"]').click();const restored=(await data()).find(d=>d.model.id===approvalId);assert.equal(restored.deletedAt,null);assert.equal(restored.versions.length,3);assert.equal(restored.notes.n2,'Explain who reviews the request.');
    await goto('workspace.php');await menu(firstId,'trash-flow');await submitDialog();await goto('trash.php');await page.locator('[data-cmd="empty-trash"]').click();await page.locator('#action-dialog [data-dismiss-dialog]').first().click();assert.ok((await data()).some(d=>d.model.id===firstId));
    await page.locator('[data-cmd="empty-trash"]').click();await submitDialog();assert.ok(!(await data()).some(d=>d.model.id===firstId));assert.ok((await data()).some(d=>d.model.id===approvalId));
  });
  await check('Appearance preferences apply to new flows while keeping existing flows unchanged',async()=>{
    await goto('settings.php');await page.locator('[data-cmd="preference-style"][data-style="clean"]').click();await page.locator('input[name="grid"]').uncheck();await page.locator('input[name="color"][value="blue"]').check();await page.locator('form[data-form="preferences"] button[type="submit"]').click();
    assert.equal((await data()).find(d=>d.model.id===approvalId).model.style,'sketch');
    await goto('canvas.php?new=1');const model=await page.evaluate(()=>window.Draftline.editor.getModel());assert.equal(model.style,'clean');assert.equal(model.nodes[0].color,'blue');assert.equal(await page.locator('.canvas-paper').evaluate(el=>el.classList.contains('hide-grid')),true);
    await page.evaluate(()=>window.Draftline.savePreferences({style:'sketch',grid:true,color:'lilac'}));
  });
  let backup;
  await check('Backup download and reviewed import preserve original IDs, notes, versions and collection links',async()=>{
    await goto('settings.php');const file=await download(page.locator('[data-cmd="download-backup"]'),'draftline-backup.json');backup=JSON.parse(file.bytes.toString());
    assert.equal(backup.format,'draftline-backup');const originals=await data();
    await page.locator('#backup-file').setInputFiles({name:'draftline-backup.json',mimeType:'application/json',buffer:file.bytes});await page.waitForSelector('.import-review');assert.equal((await data()).length,originals.length);
    await page.locator('[data-cmd="import-backup"]').click();const imported=await data();assert.equal(imported.length,originals.length*2);
    for(const before of originals)assert.deepEqual(imported.find(d=>d.model.id===before.model.id),before);
    const copy=imported.find(d=>d.model.title==='A thoughtful approval (imported)');assert.ok(copy);assert.notEqual(copy.model.id,approvalId);assert.notEqual(copy.collectionId,collectionId);assert.equal(copy.versions.length,3);assert.equal(copy.notes.n2,'Explain who reviews the request.');
  });
  await check('Malformed backups and a quota failure cannot overwrite existing data',async()=>{
    const before=await data();
    await page.locator('#backup-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad-json')});await page.waitForTimeout(100);assert.deepEqual(await data(),before);
    await page.locator('#backup-file').setInputFiles({name:'bad-model.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'draftline-backup',version:1,drafts:[{model:{nodes:[]}}],collections:[]}))});await page.waitForTimeout(100);assert.deepEqual(await data(),before);
    const result=await page.evaluate(data=>{
      const D=window.Draftline,review=D.reviewBackup(data),keys=[D.keys.drafts,D.keys.collections],original=keys.map(k=>localStorage.getItem(k)),set=Storage.prototype.setItem;
      let fail=true,message='';
      Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===D.keys.drafts&&fail){fail=false;throw new DOMException('quota','QuotaExceededError');}return set.call(this,k,v);};
      try{D.importBackup(review);}catch(error){message=error.message;}finally{Storage.prototype.setItem=set;}
      return {message,unchanged:keys.every((k,i)=>localStorage.getItem(k)===original[i])};
    },backup);assert.ok(result.message);assert.equal(result.unchanged,true);assert.deepEqual(await data(),before);
  });
  await check('Back, Forward and Refresh buttons navigate the actual browser history',async()=>{
    await goto('workspace.php');await page.locator('.app-navigation>a[href="templates.php"]').click();await page.waitForURL('**/templates.php');
    await page.locator('[data-nav="back"]').click();await page.waitForURL('**/workspace.php');await page.waitForSelector('.draft-card');
    await page.locator('[data-nav="forward"]').click();await page.waitForURL('**/templates.php');await page.waitForSelector('.template-choice');
    await page.locator('[data-nav="refresh"]').click();await page.waitForSelector('.template-choice');assert.equal(await page.locator('.template-choice').count(),4);
  });
  await check('Unknown flow IDs show a recovery state rather than opening a different flow',async()=>{
    await goto('flow.php?id=not-a-saved-flow');assert.match(await page.locator('h1').textContent(),/missing/);assert.equal(await page.locator('.details-form').count(),0);
  });
  await check('Stored names, descriptions, labels and tags render as text, not executable HTML',async()=>{
    await page.evaluate(id=>{
      const D=window.Draftline,item=D.getDraft(id);item.model.title='<img src=x onerror=window.bad=true>';
      item.model.nodes[0].label='<svg onload=window.bad=true>';
      D.updateDraft(id,{model:item.model,description:'<script>window.bad=true</script>',tags:['<img src=x>']});
    },legacyId);
    await goto('workspace.php');assert.equal(await page.locator('img[src="x"]').count(),0);assert.equal(await page.evaluate(()=>window.bad===true),false);
    await goto('flow.php?id='+legacyId);assert.equal(await page.locator('#flow-description').inputValue(),'<script>window.bad=true</script>');assert.equal(await page.evaluate(()=>window.bad===true),false);
    await page.evaluate(id=>{const D=window.Draftline,item=D.getDraft(id);item.model.title='A legacy flow';item.model.nodes[0].label='An existing beginning';D.updateDraft(id,{model:item.model,description:'An existing saved journey.',tags:['Legacy']});},legacyId);
  });
  await check('Expired Trash is purged without touching active or recoverable flows',async()=>{
    const before=await data();
    await page.evaluate(()=>{
      const D=window.Draftline,all=D.readDrafts(true),sample=D.copy(all[0]);sample.model.id='expired-fixture';sample.deletedAt=Date.now()-31*D.DAY;all.push(sample);localStorage.setItem(D.keys.drafts,JSON.stringify(all));
    });await goto('trash.php');const after=await data();assert.equal(after.length,before.length);assert.ok(!after.some(d=>d.model.id==='expired-fixture'));
  });
  await check('Corrupt existing JSON is protected and exposes a recovery backup action',async()=>{
    const isolated=await browser.newContext();const p=await isolated.newPage();await p.goto(origin+'workspace.php');await p.evaluate(()=>localStorage.setItem('draftline.drafts.v1','{unreadable'));
    await p.reload();await p.waitForSelector('.storage-banner');
    const result=await p.evaluate(()=>{try{window.Draftline.saveModel(window.Draftline.newModel());}catch(error){return {blocked:true,raw:localStorage.getItem('draftline.drafts.v1')};}return {blocked:false};});
    assert.equal(result.blocked,true);assert.equal(result.raw,'{unreadable');
    await p.goto(origin+'settings.php');await p.waitForSelector('[data-cmd="download-raw"]');await isolated.close();
  });
  await goto('workspace.php');await page.screenshot({path:path.join(output,'workspace-desktop.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'functional-results.json'),JSON.stringify({checks,errors,results,approvalId,collectionId},null,2));
  assert.deepEqual(errors,[]);
  console.log('FUNCTIONAL CHECKS:',checks,'BROWSER ERRORS:',errors.length);
  await browser.close();
})().catch(async error=>{
  console.error(error);fs.writeFileSync(path.join(output,'functional-failure.txt'),String(error.stack||error));
  if(page)try{await page.screenshot({path:path.join(output,'functional-failure.png'),fullPage:true});}catch{}
  if(browser)await browser.close();process.exit(1);
});
