function CompactChartLegend({ payload = [] }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 text-[11px] leading-none text-[#766b66]">
            {payload.map((item) => (
                <span
                    key={item.dataKey ?? item.value}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                    <i
                        aria-hidden="true"
                        className="h-2.5 w-3.5 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                    />
                    <span>{item.value}</span>
                </span>
            ))}
        </div>
    )
}

export default CompactChartLegend
