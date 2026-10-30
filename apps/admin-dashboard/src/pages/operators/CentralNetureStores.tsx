import {useCallback,useEffect,useRef,useState} from 'react';
import {authClient} from '@o4o/auth-client';
import {OperatorStoresList,type StoresApi,type StoresConfig} from '@o4o/operator-core-ui';
import {BaseDetailDrawer} from '@o4o/ui';
const http=authClient.api;
const api:StoresApi={
 listStores:async params=>(await http.get('/operator/stores',{params:{...params,serviceKey:'neture'}})).data,
 getStore:async id=>(await http.get(`/operator/stores/${encodeURIComponent(id)}`,{params:{serviceKey:'neture'}})).data.store,
};
const config:StoresConfig={serviceKey:'neture',terminology:{storeLabel:'매장'},colorScheme:'primary',typeLabels:{store:'매장',branch:'지점'},showSlugColumn:true};
type Detail={id:string;name:string;ownerName?:string;ownerEmail?:string;address?:string;addressDetail?:string;phone?:string;businessNumber?:string;description?:string;isActive:boolean};
export default function CentralNetureStores() {
 const [selected,setSelected]=useState<string|null>(null),[detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState('');const sequence=useRef(0);
 const load=useCallback(async()=>{const id=selected,seq=++sequence.current;setDetail(null);setError('');if(!id)return;try{const result=await api.getStore(id);if(seq===sequence.current)setDetail(result);}catch{if(seq===sequence.current)setError('매장 정보를 불러오지 못했습니다.');}},[selected]);
 useEffect(()=>{void load();return()=>{sequence.current++;};},[load]);
 return <section><OperatorStoresList api={api} config={config} onRowClick={row=>setSelected(row.id)} subtitle="O4O 매장 카탈로그" tableId="central-neture-stores" />
 <BaseDetailDrawer open={!!selected} onClose={()=>setSelected(null)} title="매장 기본정보" loading={!detail&&!error}>
 {error&&<p role="alert">{error}<button onClick={()=>void load()}>다시 조회</button></p>}
 {detail&&<article><h2>{detail.name}</h2><dl>{[['상태',detail.isActive?'활성':'비활성'],['경영자',detail.ownerName],['계정',detail.ownerEmail],['주소',[detail.address,detail.addressDetail].filter(Boolean).join(' ')],['연락처',detail.phone],['사업자번호',detail.businessNumber],['소개',detail.description]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'미등록'}</dd></div>)}</dl></article>}
 </BaseDetailDrawer></section>;
}
