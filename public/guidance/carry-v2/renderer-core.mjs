export function createMotionTimeline({root,data,gsap}) {
let timeline;
const context=gsap.context(()=>{
const units=[];for(let i=0;i<13;i++){const e=document.createElement('div');e.className='unit'+(i>=5?' second':'');e.id='unit'+i;e.style.left=(i<5?158+(i%3)*42:454+((i-5)%4)*42)+'px';e.style.top=(i<5?282+Math.floor(i/3)*42:282+Math.floor((i-5)/4)*42)+'px';root.querySelector('#units').append(e);units.push(e)}
const rods=[];for(let i=0;i<7;i++){const e=document.createElement('div');e.className='ten-rod'+(i>=4?' second':'');e.style.left=(120+i*57)+'px';e.style.top='225px';for(let j=0;j<10;j++)e.append(document.createElement('span'));root.querySelector('#rods').append(e);rods.push(e)}
for(let i=0;i<10;i++)root.querySelector('#carriedRod').append(document.createElement('span'));
const sparks=[];for(let i=0;i<7;i++){const e=document.createElement('span');e.className='spark';e.textContent='✦';e.style.left=(940+(i%4)*60)+'px';e.style.top=(480+Math.floor(i/4)*60)+'px';e.setAttribute('data-layout-ignore','');root.querySelector('#sparks').append(e);sparks.push(e)}
const tl=gsap.timeline({paused:true,defaults:{ease:'power2.out'}});
const hide=[...units,...rods,...sparks,'#groupRing','#carriedRod','#fiveLabel','#eightLabel','#fourLabel','#threeLabel','#oneLabel','#carryPath','#carry','#answer3','#answer8','#answerRing','#aha','#hooray','.math-panel','.column-label','.digit','.math-line','#columnGlow'];
tl.set(hide,{opacity:0},0);
tl.from('.header',{opacity:0,y:-15,duration:.55},.1).from('.title',{opacity:0,x:-20,duration:.7,ease:'power3.out'},.2).from('#robot',{opacity:0,x:60,rotation:6,duration:.8,ease:'back.out(1.2)'},.4);
function appear(target,t,vars={}){tl.fromTo(target,{opacity:0,y:12},{opacity:1,y:0,duration:.5,ease:'power3.out',immediateRender:false,...vars},t)}
let groupStart=0,exchangeStart=0,carryStart=0;
const eventLabels=[];
for(const [i,event]of data.events.entries()){
 const t=event.time,a=event.action;
 if(event.screenText&&!a.startsWith('sticker')){const e=document.createElement('div');e.style.cssText='position:absolute;left:80px;top:174px;max-width:740px;font-size:24px;font-weight:600;color:#416bb0';e.id='eventLabel'+i;e.style.opacity='0';e.textContent=event.screenText;root.querySelector('#sceneLabels').append(e);tl.fromTo(e,{opacity:0,y:6},{opacity:1,y:0,duration:.25,immediateRender:false},t);eventLabels.push({el:e,time:t});}
 switch(a){
 case'show_problem':appear(['.math-panel','.column-label','#d4','#d5','#d3','#d8','.plus','.math-line'],t);appear('#columnGlow',t+.2);break;
 case'show_units_left':units.slice(0,5).forEach((e,i)=>appear(e,t+i*.05,{ease:'back.out(1.3)',scale:1}));appear('#fiveLabel',t+.2);break;
 case'show_units_right':units.slice(5).forEach((e,i)=>appear(e,t+i*.04,{ease:'back.out(1.3)',scale:1}));appear('#eightLabel',t+.2);break;
 case'combine_units':tl.to(units,{scale:1.12,duration:.3,yoyo:true,repeat:1},t);break;
 case'group_ten':groupStart=t;for(let i=0;i<13;i++){const x=i<10?199:600+(i-10)*43,y=i<10?225+i*20:310;tl.to(units[i],{x:x-parseFloat(units[i].style.left),y:y-parseFloat(units[i].style.top),scale:i<10?.66:1,duration:1.1,ease:'power2.inOut'},t+i*.02)}tl.to(['#fiveLabel','#eightLabel'],{opacity:0,duration:.25},t);appear('#groupRing',t+1.1);break;
 case'exchange_ten':exchangeStart=t;appear('#carriedRod',t,{ease:'back.out(1.2)'});tl.to(units.slice(0,10),{opacity:0,duration:.3},t+.2);tl.to('#groupRing',{opacity:0,duration:.3},t+.7);break;
 case'write_units':appear('#answer3',t,{ease:'back.out(1.3)'});break;
 case'carry_ten':carryStart=t;appear('#carryPath',t);tl.to('#carriedRod',{x:795,y:-11,scale:.17,duration:1.2,ease:'power2.inOut',transformOrigin:'0 0'},t);appear('#carry',t+.8,{scale:1,ease:'back.out(1.4)'});tl.to(['#carriedRod','#carryPath'],{opacity:0,duration:.3},t+1.4);break;
 case'show_tens_left':rods.slice(0,4).forEach((e,i)=>appear(e,t+i*.07));appear('#fourLabel',t+.2);tl.to('#columnGlow',{x:-79,duration:.6,ease:'power2.inOut'},t);units.slice(10).forEach((e,i)=>tl.to(e,{x:715+i*35-parseFloat(e.style.left),y:310-parseFloat(e.style.top),duration:.7},t));tl.to('#d4',{color:'#416bb0',scale:1.12,duration:.3,repeat:1,yoyo:true},t);break;
 case'show_tens_right':rods.slice(4).forEach((e,i)=>appear(e,t+i*.09));appear('#threeLabel',t+.2);tl.to('#d3',{color:'#8371bc',scale:1.12,duration:.3,repeat:1,yoyo:true},t);break;
 case'add_carry_ten':tl.set('#carriedRod',{x:398,y:0,scale:1},t);appear('#carriedRod',t,{ease:'bounce.out',duration:.8});appear('#oneLabel',t+.2);tl.to('#carry',{scale:1.3,duration:.35,repeat:1,yoyo:true},t);break;
 case'sum_tens':tl.to([...rods,'#carriedRod'],{scale:1.04,duration:.3,repeat:1,yoyo:true},t);break;
 case'write_tens':appear('#answer8',t,{ease:'back.out(1.6)'});break;
 case'conclude':appear('#answerRing',t);tl.to(['#fourLabel','#threeLabel','#oneLabel'],{opacity:0,duration:.3},t);break;
 case'emphasize_carry':tl.to('#carry',{scale:1.3,duration:.4,repeat:3,yoyo:true,ease:'sine.inOut'},t);break;
 case'sticker_aha':appear('#aha',t,{ease:'back.out(1.5)'});tl.to('#aha',{opacity:0,duration:.35},t+2.5);tl.to('#robot',{y:-14,rotation:5,duration:.3},t).to('#robot',{y:0,rotation:0,duration:.6,ease:'bounce.out'},t+.3);break;
 case'sticker_celebrate':appear('#hooray',t,{ease:'back.out(1.5)'});tl.to('#robot',{y:-22,rotation:-6,duration:.3},t).to('#robot',{y:0,rotation:0,duration:.6,ease:'bounce.out'},t+.3);sparks.forEach((e,i)=>{appear(e,t+i*.07,{scale:1,ease:'back.out(1.7)'});tl.to(e,{opacity:0,y:-20,duration:.8},t+1.4+i*.07)});break;
 }
}
for(let i=0;i<eventLabels.length-1;i++)tl.to(eventLabels[i].el,{opacity:0,duration:.15},Math.max(eventLabels[i].time+.25,eventLabels[i+1].time-.15));
for(const [i,clip]of data.clips.clips.entries()){const e=document.createElement('p');e.className='caption';e.id='caption'+i;e.style.opacity='0';e.textContent=clip.narration;root.querySelector('#captions').append(e);tl.fromTo(e,{opacity:0},{opacity:1,duration:.12,immediateRender:false},clip.start);if(i<data.clips.clips.length-1)tl.to(e,{opacity:0,duration:.12},clip.end-.12)}
tl.fromTo('#progressFill',{scaleX:0},{scaleX:1,duration:data.clips.duration,ease:'none'},0);

timeline=tl;
},root);
return {timeline,dispose(){context.revert()}};
}
