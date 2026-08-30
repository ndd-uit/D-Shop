import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

function OrderStatusChart({ data, total, fullWidth = false }) {
    return <article className={`flex h-[500px] flex-col rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-6 sm:p-8 ${fullWidth ? "lg:col-span-10" : "lg:col-span-6"}`}>
        <div className="flex justify-between"><h2 className="font-serif text-xl font-semibold">Đơn thuê theo trạng thái</h2><b className="text-sm text-[#766b66]">{total} đơn</b></div>
        <div className="mt-8 min-h-0 flex-1">{data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 22, right: 8, left: -20, bottom: 35 }}><CartesianGrid stroke="#eadfd6" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#766b66", fontSize: 10 }} interval={0} angle={-12} textAnchor="end" /><YAxis allowDecimals={false} tick={{ fill: "#897d77", fontSize: 10 }} /><Tooltip cursor={{ fill: "#faf6ef" }} formatter={(value) => [`${value} đơn`, "Số lượng"]} /><Bar dataKey="count" fill="#f2a39b" radius={[8, 8, 0, 0]} maxBarSize={38}><LabelList dataKey="count" position="top" fill="#453c38" fontSize={12} fontWeight={700} /></Bar></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl bg-[#faf6ef]/60 text-sm text-[#897d77]">Chưa có đơn thuê để thống kê.</div>}</div>
    </article>
}

export default OrderStatusChart
