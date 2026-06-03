export default function AppLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-[#2dd4bf]" />
        <p className="mt-4 text-center text-sm text-[#666]">加载中...</p>
      </div>
    </div>
  );
}
