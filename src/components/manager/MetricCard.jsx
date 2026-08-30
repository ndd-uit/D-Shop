function MetricCard({ label, value, icon: Icon, tone, valueClass = "", valueSizeClass = "text-[38px]" }) {
    return <article className="flex h-44 flex-col justify-between rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-6 shadow-[0_8px_30px_rgba(89,67,55,.035)] hover:border-[#f2a39b]/50"><div className="flex items-start justify-between gap-4"><p className="text-[15px] font-medium text-[#766b66]">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}><Icon size={20} /></span></div><p className={`font-serif font-semibold leading-none ${valueSizeClass} ${valueClass}`}>{value}</p></article>
}

export default MetricCard
