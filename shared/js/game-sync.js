import {saveGameSession} from "./db.js";
import {getActivePlayerSession} from "./player-session.js";

function appendText(parent,tag,text){const element=document.createElement(tag);element.textContent=String(text);parent.append(element);return element}
function banner(session){
  if(!session)return;
  document.documentElement.classList.add("ifp-session");
  const element=document.createElement("div");element.className="game-session-banner";
  appendText(element,"strong",session.players.join(" & "));
  appendText(element,"span",session.mode==="coop"?"Berdua":"Solo");
  if(session.className)appendText(element,"span",session.className);
  appendText(element,"span",session.difficulty);
  const change=document.createElement("a");change.className="game-session-change";change.href=`../../play.html?game=${encodeURIComponent(session.gameId)}`;change.textContent="Ganti pemain";element.append(change);
  document.body.prepend(element);
  const input=document.querySelector('[name="playerName"]');if(input)input.value=session.players.join(" & ");
}
function toast(message,type="success"){
  let element=document.querySelector("[data-portal-sync-status]");
  if(!element){element=document.createElement("div");element.className="portal-sync-status";element.dataset.portalSyncStatus="";document.body.append(element)}
  element.textContent=message;element.dataset.type=type;element.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove("show"),3600);
}
async function persist(detail){
  const session=getActivePlayerSession();const names=session?.players?.length?session.players:["Pemain lokal"];
  const row=await saveGameSession({id:detail.metadata?.clientSessionId||detail.clientSessionId||crypto.randomUUID(),gameId:detail.gameSlug,gameTitle:session?.gameTitle||detail.gameSlug,mode:session?.mode||detail.mode,players:names,playerIds:session?.playerIds||[],className:session?.className||"",score:detail.score,accuracy:detail.accuracy,result:detail.result,difficulty:detail.difficulty||session?.difficulty,durationSeconds:detail.durationSeconds,correctCount:detail.correctCount,questionCount:detail.questionCount,metadata:{...detail.metadata,levelId:detail.levelId}});
  toast(`Hasil ${row.score.toLocaleString("id-ID")} poin tersimpan di perangkat.`);window.dispatchEvent(new CustomEvent("ppn:session-saved",{detail:row}));
}
document.addEventListener("DOMContentLoaded",()=>banner(getActivePlayerSession()));
window.addEventListener("ppn:game-finished",event=>persist(event.detail).catch(error=>toast(`Hasil gagal disimpan: ${error.message}`,"error")));
