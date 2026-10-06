import { createClient } from 'npm:@supabase/supabase-js@2.102.0';
const allowedOrigin='https://danal8.github.io';
Deno.serve(async(req)=>{
 const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 try{
 const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return reply(401,{error:'Authentication required'});
 const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await service.auth.getUser(token);if(authError||!auth.user)return reply(401,{error:'Invalid session'});
 const {data:admin,error:adminError}=await service.from('proini_members').select('school_owner_id,role').eq('user_id',auth.user.id).maybeSingle();
 if(adminError||admin?.role!=='admin')return reply(403,{error:'Administrator required'});
 const body=await req.json(),email=String(body.email||'').trim().toLowerCase();
 if(!email)return reply(400,{error:'Email required'});
 const {data:member,error:memberError}=await service.from('proini_members').select('role,user_id').eq('school_owner_id',admin.school_owner_id).eq('email',email).maybeSingle();
 const {data:request,error:requestError}=await service.from('proini_access_requests').select('user_id').eq('school_owner_id',admin.school_owner_id).eq('email',email).maybeSingle();
 if(memberError||requestError)return reply(500,{error:'Could not find user'});
 if(member?.role==='admin')return reply(403,{error:'Administrator account is protected'});
 if(!member&&!request)return reply(404,{error:'User not in this school'});
 const target=member?.user_id||request?.user_id;
 if(body.user_id&&body.user_id!==target)return reply(400,{error:'User mismatch'});
 if(target){
  if(target===auth.user.id||target===admin.school_owner_id)return reply(403,{error:'Administrator account is protected'});
  const {data:targetAuth,error:targetError}=await service.auth.admin.getUserById(target);
  if(targetError||targetAuth.user?.email?.toLowerCase()!==email)return reply(400,{error:'User mismatch'});
  const {error}=await service.auth.admin.deleteUser(target);if(error)return reply(500,{error:'Account deletion failed'});
 }
 const {error:removeError}=await service.from('proini_members').delete().eq('school_owner_id',admin.school_owner_id).eq('email',email).eq('role','teacher');
 if(removeError)return reply(500,{error:'Membership deletion failed'});
 return reply(200,{success:true});
 }catch{return reply(500,{error:'Could not delete user'})}
});
