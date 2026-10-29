const {chromium}=require(process.env.DRAFTLINE_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const origin=process.env.DRAFTLINE_BASE_URL || 'http://localhost:8096/',output=process.env.DRAFTLINE_TEST_OUTPUT || path.resolve(__dirname,'../../test-results');
fs.mkdirSync(output,{recursive:true});
const sizes=[
  ['desktop',1440,1000],['laptop',1280,800],['tablet-landscape',1024,768],
  ['tablet-portrait',768,1024],['mobile',390,844],['small-mobile',320,740]
];
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.DRAFTLINE_BROWSER_CHANNEL?{channel:process.env.DRAFTLINE_BROWSER_CHANNEL}:{})}),results=[],errors=[],failures=[];
  for(const [label,width,height] of sizes){
    const context=await browser.newContext({viewport:{width,height},acceptDownloads:true}),page=await context.newPage();
    page.on('pageerror',error=>errors.push({label,message:error.message}));
    page.on('console',message=>{if(message.type()==='error')errors.push({label,message:message.text()});});
    await page.goto(origin+'workspace.php');await page.waitForSelector('#page-content[aria-busy="false"]');
    const fixture=await page.evaluate(()=>{
      const D=window.Draftline;
      const collection=D.saveCollection({name:'Website refresh',description:'Onboarding, checkout, and approval for the next version of our shop.'});
      const ids=['onboarding','checkout','approval'].map(key=>D.createFromTemplate(key,collection.id).model.id),id=ids[2];
      D.updateDraft(id,{description:'A thoughtful review before the next step.',goal:'Make approval and revision clear.',tags:['Approval','Product'],notes:{n1:'Bring a little context.',n3:'Name the person who makes the decision.'}});
      D.saveVersion(id,'v1 · A first approval');const item=D.getDraft(id);item.model.nodes[1].label='Review the details';D.updateDraft(id,{model:item.model});
      D.saveVersion(id,'v2 · A clearer review');
      const trash=D.createFromTemplate('support');D.rename(trash.model.id,'An earlier support flow');D.moveToTrash(trash.model.id);
      return {id,collection:collection.id};
    });
    const routes=[
      ['01-workspace','workspace.php'],['02-templates','templates.php'],['03-template-details','template.php?id=approval'],
      ['04-flow-details','flow.php?id='+fixture.id],['05-collection','collections.php?id='+fixture.collection],
      ['06-presentation','present.php?id='+fixture.id],['07-history','history.php?id='+fixture.id],
      ['08-export','export.php?id='+fixture.id],['09-trash','trash.php'],['10-settings','settings.php'],
      ['canvas','canvas.php?id='+fixture.id],['landing','']
    ];
    for(const [name,route] of routes){
      const response=await page.goto(origin+route);assert.equal(response.status(),200);
      if(!['canvas','landing'].includes(name))await page.waitForSelector('#page-content[aria-busy="false"]');
      await page.evaluate(()=>document.fonts.ready);
      const layout=await page.evaluate(()=>{
        const overflows=[...document.querySelectorAll('button,input,select,textarea,a,summary')].filter(el=>{
          const r=el.getBoundingClientRect(),s=getComputedStyle(el);
          if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none'||el.classList.contains('skip-link'))return false;
          if(el.closest('dialog:not([open])')||el.classList.contains('backup-file-input'))return false;
          return r.left < -1 || r.right > innerWidth+1;
        }).map(el=>({tag:el.tagName,text:(el.textContent||el.getAttribute('aria-label')||el.placeholder||'').trim().slice(0,60),x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right}));
        const diamonds=[...document.querySelectorAll('.flow-node')].filter(n=>n.querySelector('[data-shape="decision"]')).map(n=>{
          const text=n.querySelector('text'),box=text.getBBox(),shape=n.querySelector('.node-outline').getBBox(),cx=shape.x+shape.width/2,cy=shape.y+shape.height/2;
          let max=0;for(const x of [box.x,box.x+box.width])for(const y of [box.y,box.y+box.height])max=Math.max(max,Math.abs(x-cx)/(shape.width/2)+Math.abs(y-cy)/(shape.height/2));
          return {text:text.textContent,family:getComputedStyle(text).fontFamily,lines:text.children.length,maxCornerRatio:max};
        });
        return {pageWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflows,diamonds};
      });
      const passed=layout.scrollWidth<=width+1&&layout.overflows.length===0&&layout.diamonds.every(d=>d.maxCornerRatio<1&&d.family.includes('Caveat'));
      results.push({label,name,width,height,passed,...layout});
      if(!passed){failures.push({label,name,...layout});await page.screenshot({path:path.join(output,'failure-'+label+'-'+name+'.png'),fullPage:true});}
      const shouldCapture=(label==='desktop'&&['01-workspace','02-templates','03-template-details','06-presentation','10-settings','landing'].includes(name))||
        (label==='mobile'&&['01-workspace','02-templates','04-flow-details','06-presentation','10-settings','canvas'].includes(name))||
        (label==='tablet-landscape'&&['03-template-details','06-presentation','08-export'].includes(name))||
        (label==='tablet-portrait'&&['01-workspace','02-templates','03-template-details','09-trash','10-settings'].includes(name));
      if(shouldCapture)await page.screenshot({path:path.join(output,label+'-'+name+'.png'),fullPage:true});
    }
    console.log(label,width+'x'+height,results.filter(r=>r.label===label&&r.passed).length+'/'+routes.length,'passed');
    await context.close();
  }
  fs.writeFileSync(path.join(output,'responsive-results.json'),JSON.stringify({total:results.length,errors,failures,results},null,2));
  console.log('FAILURES',JSON.stringify(failures));console.log('ERRORS',JSON.stringify(errors));
  await browser.close();if(failures.length||errors.length)process.exit(1);
})().catch(error=>{console.error(error);process.exit(1);});
