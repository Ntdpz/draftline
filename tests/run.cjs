const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const name of ['functional.cjs','responsive.cjs']){
  const result=spawnSync(process.execPath,[path.join(__dirname,'browser',name)],{stdio:'inherit',env:process.env});
  if(result.status!==0)process.exit(result.status||1);
}
