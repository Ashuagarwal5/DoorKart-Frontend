'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchProducts } from '@/services/api/admin-api';
import { QueryView } from '@/components/ui/states';

export type ComboSelection = {productId:string;quantity:number;productName:string};
export function ComboEditor({value,onChange,disabled}:{value:ComboSelection[];onChange:(value:ComboSelection[])=>void;disabled:boolean}) {
  const [search,setSearch]=useState('');
  const query=useApiQuery(`components:${search}`,()=>fetchProducts({search,kind:'STANDARD',limit:20}));
  return <div className="space-y-4">
    <p className="text-sm text-muted">Choose at least two different products. Quantities are physical units per combo; stock is shared with individual purchases.</p>
    {value.map(item=><div key={item.productId} className="flex flex-wrap items-end gap-3 rounded-lg border border-line p-3">
      <TextField label={item.productName} type="number" min={1} max={10000} step={1} value={item.quantity} disabled={disabled} onChange={e=>onChange(value.map(c=>c.productId===item.productId?{...c,quantity:Number(e.target.value)}:c))}/>
      <Button disabled={disabled} onClick={()=>onChange(value.filter(c=>c.productId!==item.productId))}>Remove</Button>
    </div>)}
    <TextField label="Find a component product" value={search} onChange={e=>setSearch(e.target.value)} disabled={disabled}/>
    <QueryView query={query}>{data=><div className="max-h-64 space-y-2 overflow-y-auto">{data.items.filter(p=>!value.some(c=>c.productId===p.id)).map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-bg p-3"><span className="text-sm">{p.name}<span className="block text-xs text-muted">{p.sku} · {p.availableQuantity} available{!p.isActive?' · Inactive':''}</span></span><Button size="sm" disabled={disabled||value.length>=30} onClick={()=>onChange([...value,{productId:p.id,productName:p.name,quantity:1}])}>Add</Button></div>)}{!data.items.length&&<p className="text-sm text-muted">No matching products.</p>}<p className="text-xs text-muted">Showing up to 20 matches. Search by name or SKU to find other products.</p></div>}</QueryView>
  </div>;
}
