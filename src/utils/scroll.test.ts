import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollToSection } from './scroll';

const scrollTo=vi.fn();const querySelector=vi.fn();
const anchor=(top:number,height=4000)=>({getBoundingClientRect:()=>({top,height})}) as HTMLElement;
beforeEach(()=>{
  vi.stubGlobal('window',{scrollY:800,scrollX:0,scrollTo});
  vi.stubGlobal('document',{querySelector});
  querySelector.mockReturnValue({getBoundingClientRect:()=>({height:72})});
});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
describe('admin tab scroll position',()=>{
  it('uses the top anchor and header offset instead of the bottom of a tall section',()=>{
    scrollToSection(anchor(-500,4000));
    expect(scrollTo).toHaveBeenCalledWith({top:212,left:0,behavior:'instant'});
  });
  it('gives short and tall tab contents the same scroll position',()=>{
    scrollToSection(anchor(-500,200));scrollToSection(anchor(-500,6000));
    expect(scrollTo.mock.calls[0]).toEqual(scrollTo.mock.calls[1]);
  });
  it('clamps anchors near the top to zero rather than overscrolling',()=>{
    scrollToSection(anchor(-800));expect(scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'});
  });
  it('accounts for the actual responsive header height',()=>{
    querySelector.mockReturnValue({getBoundingClientRect:()=>({height:100})});
    scrollToSection(anchor(-500));expect(scrollTo).toHaveBeenCalledWith({top:184,left:0,behavior:'instant'});
  });
  it('does not change scroll when the target is unmounted',()=>{
    scrollToSection(null);expect(scrollTo).not.toHaveBeenCalled();
  });
});
