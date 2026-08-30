import { Check, Clock3 } from "lucide-react"

import { getOrderStatusMeta } from "./orderStatus.js"

const formatDateTime = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "Chưa cập nhật"

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date)
}

function RentalOrderTimeline({ history, currentStatus }) {
    const entries =
        history.length > 0
            ? history
            : [
                  {
                      historyId: `current-${currentStatus}`,
                      newStatus: currentStatus,
                      changedAt: null,
                      reason: null,
                  },
              ]

    return (
        <section className="rounded-2xl border border-[#e9e0d8] bg-brand-surface p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-text">Lịch sử trạng thái</h2>
            <ol className="mt-6 space-y-0">
                {entries.map((entry, index) => {
                    const meta = getOrderStatusMeta(entry.newStatus)
                    const isLatest = index === entries.length - 1

                    return (
                        <li
                            key={entry.historyId}
                            className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-6 last:pb-0"
                        >
                            {index < entries.length - 1 && (
                                <span className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-[#ded2cb]" />
                            )}
                            <span
                                className={`relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                                    isLatest
                                        ? "border-brand-primary bg-[#fbe2de] text-[#a9544d]"
                                        : "border-[#d9cdc7] bg-white text-[#66716b]"
                                }`}
                            >
                                {isLatest ? (
                                    <Clock3 size={15} strokeWidth={1.9} />
                                ) : (
                                    <Check size={15} strokeWidth={2} />
                                )}
                            </span>
                            <div className="min-w-0 pt-1">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm font-semibold text-brand-text">
                                        {meta.label}
                                    </p>
                                    {entry.changedAt && (
                                        <time className="text-xs text-gray-500">
                                            {formatDateTime(entry.changedAt)}
                                        </time>
                                    )}
                                </div>
                                {entry.reason && (
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                        {entry.reason}
                                    </p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}

export default RentalOrderTimeline
