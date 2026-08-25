import { useStore } from '../store/store';

export function Toast() {
  const { state } = useStore();
  if (!state.toast) return null;
  return (
    <div
      className="fixed bottom-[22px] left-1/2 -translate-x-1/2 z-[70] rounded-[10px] px-[18px] py-[10px] text-[13px] font-semibold animate-ae-in"
      style={{ background: 'var(--text)', color: 'var(--bg)', boxShadow: '0 12px 30px -8px rgba(0,0,0,0.4)' }}
    >
      {state.toast}
    </div>
  );
}
