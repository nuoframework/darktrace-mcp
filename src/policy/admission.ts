import type { Config } from '../config/schema.js';
import type { Operation } from '../api/operations.js';

/** Reviewed ceiling: the operator may lower maxWritesPerMinute (config), never raise it above this. */
export const MAX_WRITES_PER_MINUTE_CEILING=10;
export const CRITICAL_WRITES_PER_MINUTE=3;
export const WRITE_BREAKER_THRESHOLD=3;
export const MAX_PENDING_APPROVALS_PER_SESSION=1;
export const MAX_PENDING_APPROVALS_PER_PROCESS=4;
export const APPROVAL_DEADLINE_MS=30_000;
const WINDOW_MS=60_000;

/**
 * Write admission state per trusted runtime context (the operation client the server was built with; one per
 * stdio process). Slots are reserved synchronously before any await, so concurrent calls never exceed a cap;
 * a reservation is committed at dispatch (attempted upstream failures and audit failures keep their slot) or
 * released when the call ends before admission (declined/timed-out approval).
 */
interface WriteState { all:number[]; critical:number[]; heldAll:number; heldCritical:number; streak:number; open:boolean; }
const states=new WeakMap<object,WriteState>();
function stateOf(owner:object):WriteState {
  let state=states.get(owner);
  if (!state) {state={all:[],critical:[],heldAll:0,heldCritical:0,streak:0,open:false};states.set(owner,state);}
  return state;
}
export interface WriteSlot { commit():void; release():void; }
export function reserveWriteSlot(owner:object,op:Operation,cfg:Config,now=Date.now()):WriteSlot|'write_rate_limited'|'critical_rate_limited' {
  const state=stateOf(owner);
  // Rolling interval (now-60s, now]: an entry recorded at t expires at exactly t+60s.
  const prune=(list:number[])=>{while(list.length&&now-list[0]>=WINDOW_MS)list.shift();};
  prune(state.all);prune(state.critical);
  const limit=Math.min(cfg.limits.maxWritesPerMinute,MAX_WRITES_PER_MINUTE_CEILING);
  const critical=op.tier==='critical';
  if (state.all.length+state.heldAll>=limit) return 'write_rate_limited';
  if (critical&&state.critical.length+state.heldCritical>=CRITICAL_WRITES_PER_MINUTE) return 'critical_rate_limited';
  state.heldAll++;if (critical) state.heldCritical++;
  let done=false;
  const finish=(commit:boolean)=>{
    if (done) return;done=true;
    state.heldAll--;if (critical) state.heldCritical--;
    if (commit) {const at=Date.now();state.all.push(at);if (critical) state.critical.push(at);}
  };
  return {commit:()=>finish(true),release:()=>finish(false)};
}
/** Circuit breaker: three consecutive failed/unknown mutation outcomes deny every write until restart; reads unaffected. */
export function writeBreakerOpen(owner:object):boolean { return stateOf(owner).open; }
export function recordWriteOutcome(owner:object,success:boolean):void {
  const state=stateOf(owner);
  if (state.open) return;
  if (success) {state.streak=0;return;}
  state.streak++;
  if (state.streak>=WRITE_BREAKER_THRESHOLD) state.open=true;
}

/** Pending human approvals: at most one per session and four per process; no waiting queue. */
let processPending=0;
const sessionPending=new WeakMap<object,number>();
export function acquireApprovalSlot(session:object):(()=>void)|undefined {
  const mine=sessionPending.get(session)??0;
  if (mine>=MAX_PENDING_APPROVALS_PER_SESSION||processPending>=MAX_PENDING_APPROVALS_PER_PROCESS) return undefined;
  sessionPending.set(session,mine+1);processPending++;
  let released=false;
  return ()=>{
    if (released) return;released=true;
    sessionPending.set(session,Math.max(0,(sessionPending.get(session)??1)-1));processPending=Math.max(0,processPending-1);
  };
}
