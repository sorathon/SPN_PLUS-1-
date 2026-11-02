const https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const url='https://spnr.devnetbay.com/support/SPN/login.php';
const finish=result=>{
 const folder=path.resolve(__dirname,'../../ai-support/evidence/gcl-availability');fs.mkdirSync(folder,{recursive:true});
 const checked=new Date().toISOString(),data={checked,...result};
 fs.writeFileSync(path.join(folder,checked.replace(/[:.]/g,'-')+'.json'),JSON.stringify(data,null,2));
 console.log('GCL availability:',JSON.stringify(data));process.exitCode=result.available?0:2;
};
const req=https.get(url,res=>{let body='';res.on('data',b=>{body+=b});res.on('end',()=>finish({status:res.statusCode,available:res.statusCode>=200&&res.statusCode<400&&!/no available server/i.test(body),unavailableMessage:/no available server/i.test(body)?'no available server':undefined}))});
req.setTimeout(15000,()=>req.destroy(new Error('Health check timed out')));
req.on('error',e=>finish({available:false,error:e.message}));
