import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import CustomSelect from "../common/CustomSelect.jsx"
import { formatCurrency } from "../rental/rentalOrderUtils.js"
import CompactChartLegend from "./CompactChartLegend.jsx"

const options = [
    ["day", "1 ngày"],
    ["7d", "7 ngày"],
    ["month", "1 tháng"],
    ["custom", "Tùy chỉnh"],
]

const formatAxisCurrency = (value) => {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString("vi-VN", {
            maximumFractionDigits: 1,
        })}M`
    }

    if (value >= 1_000) {
        return `${Math.round(value / 1_000).toLocaleString("vi-VN")}K`
    }

    return value.toLocaleString("vi-VN")
}

function FinancialOverviewChart({
    data,
    summary,
    range,
    onRangeChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange,
    invalidRange,
    loading,
    error,
}) {
    return (
        <section
            id="finance"
            className="flex h-[560px] flex-col rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-6 sm:p-8"
        >
            <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                    <h2 className="font-serif text-xl font-semibold leading-tight">
                        Tổng quan tài chính
                    </h2>
                    <p className="mt-1.5 text-xs leading-5 text-[#897d77]">
                        Thực thu: <strong className="font-semibold text-[#534944]">
                            {formatCurrency(summary.net)}
                        </strong>
                    </p>
                    <p className="mt-1 text-[11px] text-[#a0958f]">
                        Tiền thu {formatCurrency(summary.collected)} · Hoàn tiền {formatCurrency(summary.refunded)}
                    </p>
                </div>

                <div className="w-[124px] shrink-0">
                    <CustomSelect
                        value={range}
                        onChange={onRangeChange}
                        options={options}
                        ariaLabel="Khoảng thời gian tổng quan tài chính"
                        buttonClassName="min-h-9 rounded-lg bg-[#faf6ef] px-3 py-1.5 text-xs"
                    />
                </div>
            </div>

            {range === "custom" && (
                <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
                    <label className="grid gap-1 text-[11px] font-semibold text-[#766b66]">
                        Từ ngày
                        <input
                            type="date"
                            value={customFrom}
                            onChange={onCustomFromChange}
                            className="h-9 rounded-lg border border-[#eadfd6] bg-[#faf6ef] px-3 text-xs font-medium text-[#534944] outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"
                        />
                    </label>
                    <label className="grid gap-1 text-[11px] font-semibold text-[#766b66]">
                        Đến ngày
                        <input
                            type="date"
                            value={customTo}
                            onChange={onCustomToChange}
                            className="h-9 rounded-lg border border-[#eadfd6] bg-[#faf6ef] px-3 text-xs font-medium text-[#534944] outline-none focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"
                        />
                    </label>
                </div>
            )}

            {invalidRange && (
                <p role="alert" className="mt-3 text-right text-xs font-medium text-[#b94740]">
                    Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
                </p>
            )}

            {error && !invalidRange && (
                <p role="alert" className="mt-3 text-right text-xs font-medium text-[#b94740]">
                    {error}
                </p>
            )}

            <div className="mt-6 min-h-0 flex-1">
                {loading ? (
                    <div className="h-full animate-pulse rounded-xl bg-[#faf6ef]" />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 12, left: 8, bottom: 10 }}
                    >
                        <CartesianGrid stroke="#eadfd6" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: "#766b66", fontSize: 11 }}
                            minTickGap={22}
                        />
                        <YAxis
                            width={48}
                            tick={{ fill: "#897d77", fontSize: 10 }}
                            tickFormatter={formatAxisCurrency}
                        />
                        <Tooltip
                            formatter={(value, name) => [formatCurrency(value), name]}
                            cursor={{ fill: "#faf6ef" }}
                        />
                        <Legend content={<CompactChartLegend />} height={30} />
                        <Bar name="Tiền thu" dataKey="collected" fill="#f2a39b" radius={[4, 4, 0, 0]} />
                        <Bar name="Hoàn tiền" dataKey="refunded" fill="#857371" radius={[4, 4, 0, 0]} />
                        <Bar name="Thực thu" dataKey="net" fill="#8b4d47" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                )}
            </div>
        </section>
    )
}

export default FinancialOverviewChart
