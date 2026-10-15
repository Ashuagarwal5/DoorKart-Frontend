'use client';
import { type FormEvent, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckboxField, TextField } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import type { PackVariant, Product } from '@/types/api';
import { createPack, updatePack } from '@/services/api/admin-api';
import { describeApiError, toApiError } from '@/services/api/api-error';
import { paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

export function PackManager({product,onSaved}:{product:Product;onSaved:()=>void}) {
  if(product.kind==='COMBO')return null;
  return <Card title="Quantity packs"><p className="mb-4 text-sm text-muted">The product price above is for one unit. Add discounted packs below. Each pack consumes the stated number of units from the same stock. Pack sizes stay fixed; deactivate packs to stop selling them.</p><div className="space-y-4">{product.variants?.map(pack=><PackForm key={pack.id} productId={product.id} pack={pack} onSaved={onSaved}/>)}<PackForm key={product.updatedAt} productId={product.id} onSaved={onSaved}/></div></Card>;
}
function PackForm({productId,pack,onSaved}:{productId:string;pack?:PackVariant;onSaved:()=>void}) {
  const [values,setValues]=useState({label:pack?.label??'',sku:pack?.sku??'',units:String(pack?.unitsPerPack??3),mrp:pack?paiseToRupeeInput(pack.mrpPaise):'',price:pack?paiseToRupeeInput(pack.sellingPricePaise):'',active:pack?.isActive??true});
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const toast=useToast();
  const set=(key:keyof typeof values,value:string|boolean)=>setValues(v=>({...v,[key]:value}));
  async function submit(e:FormEvent){e.preventDefault();if(busy)return;setError('');
    const mrpPaise=parseRupeesToPaise(values.mrp),sellingPricePaise=parseRupeesToPaise(values.price);
    if(!values.label.trim()||!values.sku.trim()||mrpPaise===null||sellingPricePaise===null||sellingPricePaise>mrpPaise||!/^\d+$/.test(values.units)||Number(values.units)<2||Number(values.units)>10000){setError('Enter a label, SKU, whole pack size of 2–10,000, and valid prices with selling price at or below MRP.');return;}
    setBusy(true);try{const body={label:values.label.trim(),sku:values.sku.trim(),mrpPaise,sellingPricePaise,isActive:values.active};if(pack)await updatePack(productId,pack.id,body);else await createPack(productId,{...body,unitsPerPack:Number(values.units)});toast.success('Pack saved.');if(!pack)setValues({label:'',sku:'',units:'3',mrp:'',price:'',active:true});onSaved();}catch(e){setError(describeApiError(toApiError(e)));}finally{setBusy(false);}}
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-line p-4"><h3 className="text-sm font-semibold">{pack?pack.label:'Add a pack'}</h3><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><TextField required label="Pack label" value={values.label} maxLength={100} onChange={e=>set('label',e.target.value)}/><TextField required label="Pack SKU" value={values.sku} maxLength={64} onChange={e=>set('sku',e.target.value)}/><TextField required label="Units per pack" type="number" min={2} max={10000} step={1} value={values.units} disabled={Boolean(pack)} onChange={e=>set('units',e.target.value)}/><TextField required label="Pack MRP (₹)" inputMode="decimal" value={values.mrp} onChange={e=>set('mrp',e.target.value)}/><TextField required label="Pack selling price (₹)" inputMode="decimal" value={values.price} onChange={e=>set('price',e.target.value)}/></fieldset><div className="flex flex-wrap items-center justify-between gap-3"><CheckboxField label="Active" checked={values.active} disabled={busy} onChange={e=>set('active',e.target.checked)}/><Button type="submit" variant="primary" loading={busy}>{pack?'Save pack':'Add pack'}</Button></div>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}</form>;
}
