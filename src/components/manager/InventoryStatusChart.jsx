import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

function InventoryStatusChart({ segments }) {
    const data = segments.filter((item) => item.count > 0)
    const total = segments.reduce((sum, item) => sum + item.count, 0)
    return <article id="inventory" className="flex h-[500px] flex-col rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-6 sm:p-8 lg:col-span-4"><div><h2 className="font-serif text-xl font-semibold">Trạng thái RentalUnit</h2><p className="mt-1 text-xs text-[#897d77]">Phân bổ toàn bộ sản phẩm vật lý trong kho</p></div><div className="relative mx-auto h-64 w-64">{total > 0 && <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="label" innerRadius={70} outerRadius={96} paddingAngle={1}>{data.map((item) => <Cell key={item.status} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value} RentalUnit`, "Số lượng"]} /></PieChart></ResponsiveContainer>}<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><b className="font-serif text-4xl">{total}</b><span className="text-sm text-[#897d77]">RentalUnit</span></div></div><div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2.5">{data.map((item) => <div key={item.status} className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} /><span className="text-[#766b66]">{item.label}</span><b className="ml-1">{item.count} · {total ? Math.round(item.count / total * 100) : 0}%</b></div>)}{!data.length && <p className="text-center text-xs text-[#897d77]">Kho chưa có RentalUnit.</p>}</div></article>
}

export default InventoryStatusChart
