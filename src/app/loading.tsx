export default function aficLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#1e5fa8',
              borderRightColor: '#0ea5a0',
              animation: 'spin 0.9s linear infinite',
            }}
          />
        </div>
        <p className="text-sm font-medium" style={{ color: '#64748b' }}>Carregando…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
