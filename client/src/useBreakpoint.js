import { useEffect, useState } from 'react';
export function useBreakpoint(query='(max-width: 1024px)'){
  const [match,setMatch] = useState(false);
  useEffect(()=>{ const m = window.matchMedia(query); const on = ()=>setMatch(m.matches);
    on(); m.addEventListener('change', on); return ()=>m.removeEventListener('change', on);
  },[query]); return match;
}