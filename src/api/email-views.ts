import type { ResponseView } from './response-view.js';

/**
 * Reviewed minimal views for Darktrace/EMAIL reads (CR-05, AD-W-12, ST-26). The SDK (openapi/darktrace-sdk.yaml,
 * pinned per operation by schemaSha256) leaves every EMAIL response unmodeled, so these allowlists are code-owned:
 * identifiers, timestamps, direction, sender/recipient DOMAINS, verdict/action names and counts. Never subject,
 * body, headers, attachments, addresses or URLs — except the message-detail operation, which adds the subject only.
 * Field names are not lab-confirmed (the lab token answered 403): anything else is dropped, never passed through.
 */
const n:ResponseView={kind:'number'},s:ResponseView={kind:'string'},b:ResponseView={kind:'boolean'};
const ns:ResponseView={kind:'union',variants:[n,s]};
const list=(item:ResponseView):ResponseView=>({kind:'array',items:item});
const strings=list(s);
const object=(fields:Record<string,ResponseView>):ResponseView=>({kind:'object',fields});
/** Item lists may arrive bare or wrapped; both shapes use the same item allowlist. */
const listing=(item:ResponseView,keys:readonly string[]):ResponseView=>({kind:'union',variants:[
  list(item),object({...Object.fromEntries(keys.map(key=>[key,list(item)])),total:n,count:n,offset:n,limit:n,status:s})]});

const COUNTS=object({days:n,limit:n,total:n,count:n,inbound:n,outbound:n,internal:n,delivered:n,held:n,actioned:n,
  blocked:n,released:n,quarantined:n,anomalous:n,status:s,
  data:list(object({time:ns,date:ns,timestamp:ns,action:s,name:s,model:s,direction:s,count:n,total:n,
    sender_domain:s,recipient_domain:s,domain:s}))});
const MESSAGE_META={uuid:s,id:ns,time:ns,dtime:ns,timestamp:ns,direction:s,sender_domain:s,from_domain:s,
  recipient_domain:s,recipient_domains:strings,to_domains:strings,verdict:s,action:s,actions:strings,
  model_score:n,score:n,tags:strings};
const REFERENCE=object({id:ns,name:s,label:s,type:s,category:s});
const AUDIT_EVENT=object({id:ns,time:ns,timestamp:ns,eventType:s,event_type:s,action:s,result:s,status:s});

export const EMAIL_VIEWS:Readonly<Record<string,ResponseView>>=Object.freeze({
  // A decoded link is a URL; only its domain is reviewed output.
  get_agemail_api_ep_api_v1_0_admin_decode_link:object({domain:s,hostname:s,status:s,valid:b}),
  get_agemail_api_ep_api_v1_0_dash_action_summary:COUNTS,
  get_agemail_api_ep_api_v1_0_dash_dash_stats:COUNTS,
  get_agemail_api_ep_api_v1_0_dash_data_loss:COUNTS,
  get_agemail_api_ep_api_v1_0_dash_user_anomaly:COUNTS,
  // Message detail: metadata plus subject and verdict; never body, headers, addresses, links or attachments.
  get_agemail_api_ep_api_v1_0_emails_uuid:object({...MESSAGE_META,subject:s}),
  // Raw MIME download: the JSON status document only (bytes are reduced to size + SHA-256 by the tool layer).
  get_agemail_api_ep_api_v1_0_emails_uuid_download:object({status:s,state:s}),
  post_agemail_api_ep_api_v1_0_emails_search:listing(object(MESSAGE_META),['emails','results','data','items']),
  get_agemail_api_ep_api_v1_0_resources_actions:listing(REFERENCE,['actions','data','items']),
  get_agemail_api_ep_api_v1_0_resources_filters:listing(REFERENCE,['filters','data','items']),
  get_agemail_api_ep_api_v1_0_resources_tags:listing(REFERENCE,['tags','data','items']),
  get_agemail_api_ep_api_v1_0_system_audit_eventTypes:{kind:'union',variants:[strings,listing(REFERENCE,['eventTypes','event_types','data','items'])]},
  get_agemail_api_ep_api_v1_0_system_audit_events:listing(AUDIT_EVENT,['events','data','items']),
  // PCAP download status document (not the capture bytes).
  get_pcaps_filename:object({status:s,state:s,ready:b,progress:n}),
});
/** Pinned response versions per EMAIL schema; the SDK pins none, so a response that announces a version is foreign. */
export const EMAIL_SUPPORTED_RESPONSE_VERSIONS:readonly string[]=Object.freeze([]);
