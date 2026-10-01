import {afterEach,describe,it,expect,vi} from 'vitest';
import {mountCompanionConsole} from '../web/src/lib/companion-console';
import {currentDraft,resetDraft,updateDraft} from '../web/src/lib/companion-state';

class Element extends EventTarget {
  value='';textContent='';href='';disabled=false;checked=false;
  reportValidity(){return true;}
}
function setup(){
  const elements=new Map<string,Element>();
  const doc=new EventTarget() as EventTarget & {querySelector:(selector:string)=>Element};
  doc.querySelector=(selector)=>{if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector)!;};
  vi.stubGlobal('document',doc);
  resetDraft();
  const pending:Array<{message:any;respond:(value:unknown)=>void}>=[];
  vi.stubGlobal('chrome',{runtime:{sendMessage:(message:unknown,respond:(value:unknown)=>void)=>pending.push({message,respond})}});
  mountCompanionConsole();
  doc.querySelector('#companion-route').value='codex';
  doc.querySelector('#companion-question').value='Original question';
  return {doc,pending,e:doc.querySelector};
}
afterEach(()=>{resetDraft();vi.unstubAllGlobals();});
describe('Asynchronous companion response ownership',()=>{
  it('does not start a model turn after logout during the checkpoint',async()=>{
    const {doc,pending,e}=setup();
    e('[data-companion-form]').dispatchEvent(new Event('submit',{cancelable:true}));
    resetDraft();doc.dispatchEvent(new Event('orbit:logout'));
    pending[0].respond({ok:true,value:{}});
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(pending).toHaveLength(1);expect(currentDraft().report).toBe('');
    expect(e('[data-companion-submit]').disabled).toBe(false);
  });
  it('discards a late model response after another workspace is selected',async()=>{
    const {doc,pending,e}=setup();
    e('[data-companion-form]').dispatchEvent(new Event('submit',{cancelable:true}));
    pending[0].respond({ok:true,value:{}});
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(pending[1].message.type).toBe('orbit.companion');
    updateDraft({requestId:'other',question:'Different mission',report:'Keep this report'});
    e('#companion-question').value='Different mission';
    e('[data-companion-answer]').textContent='Keep this report';
    doc.dispatchEvent(new Event('orbit:workspace-selected'));
    pending[1].respond({ok:true,value:{text:'Old response',model:'fixture',checkpoint:'c'}});
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(currentDraft().report).toBe('Keep this report');
    expect(e('[data-companion-answer]').textContent).toBe('Keep this report');
    expect(e('[data-google-search]').href).toContain('Different%20mission');
  });
});
