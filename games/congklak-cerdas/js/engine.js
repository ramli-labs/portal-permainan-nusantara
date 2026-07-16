export function createBoard(seedsPerPit=7){return {pits:[Array(7).fill(seedsPerPit),Array(7).fill(seedsPerPit)],stores:[0,0]}}
export function cloneBoard(board){return {pits:board.pits.map(row=>[...row]),stores:[...board.stores]}}
export function nextPosition(position,player){
  if(position.type==="pit"&&position.player===player){return position.index<6?{type:"pit",player,index:position.index+1}:{type:"store",player}}
  if(position.type==="store")return {type:"pit",player:1-player,index:6};
  if(position.index>0)return {type:"pit",player:1-player,index:position.index-1};
  return {type:"pit",player,index:0};
}
export function sow(board,player,index){
  let seeds=board.pits[player][index];if(!seeds)return null;
  board.pits[player][index]=0;let position={type:"pit",player,index};
  while(seeds>0){position=nextPosition(position,player);if(position.type==="store")board.stores[player]+=1;else board.pits[position.player][position.index]+=1;seeds-=1}
  const extra=position.type==="store"&&position.player===player;let captured=0;
  if(position.type==="pit"&&position.player===player&&board.pits[player][position.index]===1){const opposite=6-position.index,oppositeSeeds=board.pits[1-player][opposite];if(oppositeSeeds>0){captured=oppositeSeeds+1;board.pits[player][position.index]=0;board.pits[1-player][opposite]=0;board.stores[player]+=captured}}
  return {last:position,extra,captured};
}
export function legalMoves(board,player){return board.pits[player].map((count,index)=>count>0?index:null).filter(index=>index!==null)}
export function isGameOver(board){return board.pits[0].every(value=>value===0)||board.pits[1].every(value=>value===0)}
export function settleBoard(board){for(let player=0;player<2;player++){board.stores[player]+=board.pits[player].reduce((sum,value)=>sum+value,0);board.pits[player].fill(0)}return board}
export function totalSeeds(board){return board.stores[0]+board.stores[1]+board.pits.flat().reduce((sum,value)=>sum+value,0)}
