import { useEffect, useMemo, useState } from "react"
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    HandCoins,
    ImagePlus,
    LoaderCircle,
    PackageCheck,
    RefreshCw,
    Repeat2,
    ScanSearch,
} from "lucide-react"

import { formatCurrency } from "../rental/rentalOrderUtils.js"
import { createDepositPayment } from "../../services/paymentApi.js"
import {
    changeRentalUnitStatus,
    confirmDirectAdditionalPayment,
    handoverRentalOrder,
    inspectRentalOrderItem,
    markRentalOrderFulfillmentFailed,
    markRentalOrderNoShow,
    prepareRentalReservation,
    receiveRentalReturn,
    replaceRentalReservation,
    settleRentalOrder,
    startPreparingRentalOrder,
} from "../../services/rentalApi.js"
import { startPaymentCheckout } from "../../utils/paymentCheckout.js"

const getApiMessage = (error, fallback) =>
    (error.code === "PAYMENT_AMOUNT_MISMATCH" ? error.message : error.response?.data?.message) || fallback

const actionButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f2a39b] px-5 text-sm font-semibold text-[#453c38] transition hover:bg-[#ee9188] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2a39b] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"

const inputClass =
    "min-h-11 w-full rounded-xl border border-[#e1d6cf] bg-[#fffdf9] px-3.5 text-sm text-[#453c38] outline-none transition placeholder:text-[#aaa09a] focus:border-[#f2a39b] focus:ring-2 focus:ring-[#f2a39b]/20"

const getCurrentReservation = (item, predicate) =>
    (item.reservations ?? []).find(predicate) ?? null

function PreparationForm({ order, onCompleted }) {
    const pendingItems = order.items
        .map((item) => ({
            item,
            reservation: getCurrentReservation(
                item,
                (reservation) => reservation.status === "CONFIRMED",
            ),
        }))
        .filter(({ reservation }) => reservation && !reservation.preparedAt)
    const [drafts, setDrafts] = useState({})
    const [submittingId, setSubmittingId] = useState("")
    const [error, setError] = useState("")

    const updateDraft = (reservationId, field, value) => {
        setDrafts((current) => ({
            ...current,
            [reservationId]: {
                preparationCondition: "Tốt",
                preparationNotes: "",
                preparationImages: [],
                ...(current[reservationId] ?? {}),
                [field]: value,
            },
        }))
    }

    const submit = async (reservationId) => {
        setSubmittingId(reservationId)
        setError("")
        try {
            const draft = drafts[reservationId] ?? {
                preparationCondition: "Tốt",
                preparationNotes: "",
                preparationImages: [],
            }
            const { preparationImages, ...data } = draft
            await prepareRentalReservation(order.orderId, reservationId, data, preparationImages)
            await onCompleted("Đã ghi nhận RentalUnit sẵn sàng bàn giao.")
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể ghi nhận kết quả chuẩn bị."))
        } finally {
            setSubmittingId("")
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm leading-6 text-[#766b66]">
                Kiểm tra tình trạng và phụ kiện của từng RentalUnit trước khi xác nhận sẵn sàng.
            </p>
            {pendingItems.map(({ item, reservation }) => {
                const draft = drafts[reservation.reservationId] ?? {
                    preparationCondition: "Tốt",
                    preparationNotes: "",
                    preparationImages: [],
                }
                return (
                    <fieldset
                        key={reservation.reservationId}
                        className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 p-4"
                    >
                        <legend className="px-1 text-sm font-semibold text-[#453c38]">
                            {item.garment?.name || "Trang phục"}, size {item.requestedSize}
                        </legend>
                        <p className="mb-4 mt-1 text-xs text-[#897d77]">
                            Mã tài sản: {reservation.rentalUnit?.assetCode || "Chưa có"}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-[#665b55]">
                                Tình trạng chuẩn bị
                                <input
                                    value={draft.preparationCondition}
                                    onChange={(event) => updateDraft(reservation.reservationId, "preparationCondition", event.target.value)}
                                    maxLength={100}
                                    className={`${inputClass} mt-2`}
                                />
                            </label>
                            <label className="text-xs font-semibold text-[#665b55]">
                                Ghi chú
                                <input
                                    value={draft.preparationNotes}
                                    onChange={(event) => updateDraft(reservation.reservationId, "preparationNotes", event.target.value)}
                                    placeholder="Không bắt buộc"
                                    className={`${inputClass} mt-2`}
                                />
                            </label>
                        </div>
                        <label className="mt-3 block rounded-xl border border-dashed border-[#d8c9bf] bg-[#fffdf9] p-3 text-xs font-semibold text-[#665b55]">
                            <span className="flex items-center gap-2"><ImagePlus size={16} className="text-[#b65e56]" />Ảnh tình trạng trước thuê</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={(event) => updateDraft(reservation.reservationId, "preparationImages", Array.from(event.target.files ?? []).slice(0, 5))}
                                className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#fbe2de] file:px-3 file:py-2 file:font-semibold file:text-[#9b4d47]"
                            />
                            <span className="mt-2 block font-normal text-[#897d77]">JPG, PNG hoặc WEBP · tối đa 5 ảnh · 5MB mỗi ảnh{draft.preparationImages.length ? ` · đã chọn ${draft.preparationImages.length} ảnh` : ""}</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => submit(reservation.reservationId)}
                            disabled={Boolean(submittingId)}
                            className={`${actionButtonClass} mt-4`}
                        >
                            {submittingId === reservation.reservationId
                                ? <LoaderCircle size={17} className="animate-spin" />
                                : <CheckCircle2 size={17} />}
                            Xác nhận đã chuẩn bị
                        </button>
                    </fieldset>
                )
            })}
            {!pendingItems.length && (
                <p className="rounded-xl bg-[#d4e7dd]/45 p-4 text-sm text-[#46675b]">
                    Tất cả RentalUnit của đơn đã được chuẩn bị.
                </p>
            )}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
    )
}

function HandoverForm({ order, onCompleted }) {
    const requiredDeposit = Number(order.depositAmount)
    const collectedDeposit = Number(order.collectedDepositAmount)
    const gatewayDepositReady =
        order.depositCollectionMethod === "PAYMENT_GATEWAY" &&
        collectedDeposit === requiredDeposit &&
        Boolean(order.depositCollectedAt)
    const [nationalId, setNationalId] = useState(order.customer?.nationalId || "")
    const [method, setMethod] = useState(gatewayDepositReady ? "PAYMENT_GATEWAY" : "DIRECT")
    const [directAmount, setDirectAmount] = useState(String(requiredDeposit))
    const [confirmedItems, setConfirmedItems] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [gatewaySubmitting, setGatewaySubmitting] = useState(false)
    const [gatewayMessage, setGatewayMessage] = useState("")
    const [error, setError] = useState("")

    const handoverItems = useMemo(
        () => order.items.map((item) => ({
            item,
            reservation: getCurrentReservation(
                item,
                (reservation) => reservation.status === "CONFIRMED" && reservation.preparedAt,
            ),
        })),
        [order.items],
    )
    const allItemsReady = handoverItems.every(({ reservation }) => reservation)
    const allAccessoriesConfirmed = handoverItems.every(
        ({ item }) => confirmedItems[item.orderItemId] === true,
    )
    const depositReady = method === "DIRECT"
        ? Number(directAmount) === requiredDeposit
        : gatewayDepositReady
    const canSubmit =
        nationalId.trim() && allItemsReady && allAccessoriesConfirmed && depositReady

    const submit = async (event) => {
        event.preventDefault()
        if (!canSubmit) return
        setSubmitting(true)
        setError("")
        try {
            await handoverRentalOrder(order.orderId, {
                nationalId: nationalId.trim(),
                depositCollectionMethod: method,
                collectedDepositAmount: method === "DIRECT" ? Number(directAmount) : collectedDeposit,
                items: handoverItems.map(({ item, reservation }) => ({
                    orderItemId: item.orderItemId,
                    rentalUnitId: reservation.rentalUnitId,
                    accessoriesConfirmed: true,
                })),
            })
            await onCompleted("Đã bàn giao trang phục và ghi nhận tiền cọc.")
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể bàn giao đơn thuê."))
        } finally {
            setSubmitting(false)
        }
    }

    const startGatewayDeposit = async () => {
        setGatewaySubmitting(true)
        setGatewayMessage("")
        setError("")
        try {
            const result = await createDepositPayment(order.orderId)
            if (result.payment?.status === "SUCCEEDED") {
                await onCompleted("Tiền cọc qua cổng thanh toán đã được ghi nhận.")
                return
            }
            if (startPaymentCheckout(result, { newTab: true, expectedAmount: order.depositAmount })) {
                setGatewayMessage("Đã tạo giao dịch cọc. Hoàn tất thanh toán ở tab mới, sau đó kiểm tra lại trạng thái.")
                return
            }
            setError("Cổng thanh toán chưa trả về đường dẫn thanh toán.")
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể khởi tạo thanh toán tiền cọc."))
        } finally {
            setGatewaySubmitting(false)
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <p className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 p-4 text-sm leading-6 text-[#665b55]">
                Đối chiếu số CCCD và thu đủ tiền cọc trước khi bàn giao.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#665b55]">
                    Số CCCD đối chiếu
                    <input
                        value={nationalId}
                        onChange={(event) => setNationalId(event.target.value)}
                        className={`${inputClass} mt-2`}
                        required
                    />
                </label>
                <label className="text-xs font-semibold text-[#665b55]">
                    Hình thức thu cọc
                    <select
                        value={method}
                        onChange={(event) => setMethod(event.target.value)}
                        className={`${inputClass} mt-2`}
                    >
                        <option value="DIRECT">Trực tiếp tại cửa hàng</option>
                        <option value="PAYMENT_GATEWAY">Cổng thanh toán</option>
                    </select>
                </label>
            </div>
            {method === "DIRECT" ? (
                <label className="block text-xs font-semibold text-[#665b55]">
                    Tiền cọc đã thu, yêu cầu {formatCurrency(requiredDeposit)}
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={directAmount}
                        onChange={(event) => setDirectAmount(event.target.value)}
                        className={`${inputClass} mt-2 max-w-sm`}
                    />
                </label>
            ) : (
                <div className={`rounded-xl border p-4 text-sm ${gatewayDepositReady ? "border-[#b8d7cb] bg-[#d4e7dd]/45 text-[#46675b]" : "border-[#e8c98e] bg-[#fff7e3] text-[#76561f]"}`}>
                    <p>{gatewayDepositReady
                        ? `Đã ghi nhận đủ ${formatCurrency(collectedDeposit)} qua cổng thanh toán.`
                        : "Chưa ghi nhận đủ tiền cọc qua cổng thanh toán."}</p>
                    {!gatewayDepositReady && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={startGatewayDeposit} disabled={gatewaySubmitting} className={actionButtonClass}>
                                {gatewaySubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <HandCoins size={17} />}
                                Tạo thanh toán cọc
                            </button>
                            <button type="button" onClick={() => onCompleted("Đã cập nhật trạng thái tiền cọc.")} disabled={gatewaySubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7c8bc] bg-[#fffdf9] px-4 text-sm font-semibold text-[#665b55] hover:bg-white">
                                <RefreshCw size={16} />Kiểm tra trạng thái
                            </button>
                        </div>
                    )}
                    {gatewayMessage && <p className="mt-3 text-xs leading-5">{gatewayMessage}</p>}
                </div>
            )}
            <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-semibold text-[#665b55]">
                    Xác nhận phụ kiện theo từng RentalUnit
                </legend>
                {handoverItems.map(({ item, reservation }) => (
                    <label
                        key={item.orderItemId}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-4 text-sm"
                    >
                        <input
                            type="checkbox"
                            checked={confirmedItems[item.orderItemId] === true}
                            onChange={(event) => setConfirmedItems((current) => ({
                                ...current,
                                [item.orderItemId]: event.target.checked,
                            }))}
                            className="h-4 w-4 accent-[#b65e56]"
                        />
                        <span className="flex-1">
                            {item.garment?.name || "Trang phục"}, size {item.requestedSize}
                        </span>
                        <span className="text-xs text-[#897d77]">
                            {reservation?.rentalUnit?.assetCode || "Chưa sẵn sàng"}
                        </span>
                    </label>
                ))}
            </fieldset>
            {!depositReady && method === "DIRECT" && (
                <p className="text-sm text-red-600">Số tiền cọc phải bằng đúng tiền cọc yêu cầu.</p>
            )}
            {!allItemsReady && (
                <p className="text-sm text-red-600">Còn RentalUnit chưa được chuẩn bị đầy đủ.</p>
            )}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!canSubmit || submitting} className={actionButtonClass}>
                {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <HandCoins size={17} />}
                Xác nhận bàn giao
            </button>
        </form>
    )
}

function PreHandoverExceptions({ order, onCompleted }) {
    const reservations = order.items.flatMap((item) =>
        (item.reservations ?? [])
            .filter((reservation) => reservation.status === "CONFIRMED")
            .map((reservation) => ({ item, reservation })),
    )
    const [reasonByReservation, setReasonByReservation] = useState({})
    const [submittingKey, setSubmittingKey] = useState("")
    const [error, setError] = useState("")

    const reasonFor = (reservationId) => reasonByReservation[reservationId] ?? ""
    const updateReason = (reservationId, value) => {
        setReasonByReservation((current) => ({ ...current, [reservationId]: value }))
        setError("")
    }

    const run = async (key, action, successMessage) => {
        setSubmittingKey(key)
        setError("")
        try {
            await action()
            await onCompleted(successMessage)
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể xử lý sự cố RentalUnit."))
        } finally {
            setSubmittingKey("")
        }
    }

    if (!reservations.length) return null

    return (
        <section className="mt-5 border-t border-[#eadfd6] pt-5">
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-[#a9544d]" size={19} />
                <div>
                    <h3 className="text-sm font-semibold">RentalUnit có vấn đề</h3>
                    <p className="mt-1 text-xs leading-5 text-[#897d77]">Đánh dấu unit hư hỏng hoặc bảo trì trước, sau đó thử thay thế. Chỉ xác nhận không thể đáp ứng khi hệ thống không còn unit phù hợp.</p>
                </div>
            </div>
            <div className="mt-4 space-y-3">
                {reservations.map(({ item, reservation }) => {
                    const reservationId = reservation.reservationId
                    const unit = reservation.rentalUnit
                    const unavailable = ["DAMAGED", "MAINTENANCE"].includes(unit?.status)
                    const reason = reasonFor(reservationId)
                    return (
                        <div key={reservationId} className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div><p className="text-sm font-semibold">{item.garment?.name || "Trang phục"}, size {item.requestedSize}</p><p className="mt-1 text-xs text-[#897d77]">{unit?.assetCode || "Chưa có mã tài sản"} · {unit?.status || "Chưa rõ trạng thái"}</p></div>
                            </div>
                            <label className="mt-3 block text-xs font-semibold text-[#665b55]">Lý do xử lý<input value={reason} onChange={(event) => updateReason(reservationId, event.target.value)} placeholder="Mô tả lỗi hoặc lý do thay thế" className={`${inputClass} mt-2`} /></label>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {!unavailable && (
                                    <>
                                        <button type="button" disabled={!reason.trim() || Boolean(submittingKey)} onClick={() => run(`damage-${reservationId}`, () => changeRentalUnitStatus(unit.rentalUnitId, "DAMAGED", reason.trim()), "Đã đánh dấu RentalUnit hư hỏng.")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e6beb9] px-3.5 text-xs font-semibold text-[#9b4d47] hover:bg-[#fbe2de] disabled:opacity-50">{submittingKey === `damage-${reservationId}` && <LoaderCircle size={15} className="animate-spin" />}Đánh dấu hư hỏng</button>
                                        <button type="button" disabled={!reason.trim() || Boolean(submittingKey)} onClick={() => run(`maintenance-${reservationId}`, () => changeRentalUnitStatus(unit.rentalUnitId, "MAINTENANCE", reason.trim()), "Đã chuyển RentalUnit sang bảo trì.")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e8c98e] px-3.5 text-xs font-semibold text-[#876022] hover:bg-[#fff0cf] disabled:opacity-50">{submittingKey === `maintenance-${reservationId}` && <LoaderCircle size={15} className="animate-spin" />}Chuyển bảo trì</button>
                                    </>
                                )}
                                {unavailable && (
                                    <>
                                        <button type="button" disabled={!reason.trim() || Boolean(submittingKey)} onClick={() => run(`replace-${reservationId}`, () => replaceRentalReservation(order.orderId, reservationId, reason.trim()), "Đã thay RentalUnit và đưa đơn về bước chuẩn bị.")} className={actionButtonClass}>{submittingKey === `replace-${reservationId}` ? <LoaderCircle size={16} className="animate-spin" /> : <Repeat2 size={16} />}Thử thay RentalUnit</button>
                                        <button type="button" disabled={!reason.trim() || Boolean(submittingKey)} onClick={() => run(`failed-${reservationId}`, () => markRentalOrderFulfillmentFailed(order.orderId, reservationId, reason.trim()), "Đã ghi nhận cửa hàng không thể đáp ứng đơn.")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e6beb9] px-4 text-sm font-semibold text-[#9b4d47] hover:bg-[#fbe2de] disabled:opacity-50">{submittingKey === `failed-${reservationId}` && <LoaderCircle size={16} className="animate-spin" />}Không thể đáp ứng</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </section>
    )
}

function NoShowAction({ order, onCompleted }) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [now, setNow] = useState(() => Date.now())
    const pickupAt = new Date(order.rentalStartAt).getTime()
    const noShowCutoff = Number.isFinite(pickupAt) ? pickupAt + 10 * 60 * 60 * 1000 : Number.POSITIVE_INFINITY
    const depositNotCollected = Number(order.collectedDepositAmount ?? 0) === 0 && !order.depositCollectedAt
    const canMarkNoShow = now > noShowCutoff && !order.actualPickupAt && depositNotCollected
    const waitingForCutoff = now <= noShowCutoff && !order.actualPickupAt && depositNotCollected

    useEffect(() => {
        if (!waitingForCutoff) return undefined
        const timer = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(timer)
    }, [waitingForCutoff])

    const submit = async () => {
        if (!canMarkNoShow) return
        if (!window.confirm("Xác nhận khách không đến nhận trang phục? Thao tác này sẽ kết thúc đơn.")) return
        setSubmitting(true)
        setError("")
        try {
            await markRentalOrderNoShow(order.orderId)
            await onCompleted("Đã ghi nhận khách không đến nhận trang phục.")
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể cập nhật đơn không đến nhận."))
        } finally {
            setSubmitting(false)
        }
    }
    return <div className="mt-5 border-t border-[#eadfd6] pt-5">
        <p className="text-xs leading-5 text-[#897d77]">
            {canMarkNoShow
                ? "Đơn đã qua 18:00 ngày nhận, chưa bàn giao và chưa thu cọc."
                : "Chỉ có thể ghi nhận NO_SHOW sau 18:00 ngày nhận, khi chưa bàn giao và chưa thu cọc."}
        </p>
        <button type="button" onClick={submit} disabled={submitting || !canMarkNoShow} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e6beb9] px-4 text-sm font-semibold text-[#9b4d47] hover:bg-[#fbe2de] disabled:cursor-not-allowed disabled:opacity-50">{submitting && <LoaderCircle size={16} className="animate-spin" />}Khách không đến nhận</button>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
}

function InspectionItemForm({ orderId, item, onCompleted }) {
    const [form, setForm] = useState({
        condition: "Tốt",
        accessoriesStatus: "Đầy đủ",
        issueType: "",
        description: "",
        evidenceImages: [],
        proposedCharge: "0",
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const charge = Number(form.proposedCharge)
    const chargeEvidenceMissing = charge > 0 && (
        !form.issueType || !form.description.trim() || form.evidenceImages.length === 0
    )

    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))
    const submit = async (event) => {
        event.preventDefault()
        if (!Number.isFinite(charge) || charge < 0 || chargeEvidenceMissing) return
        setSubmitting(true)
        setError("")
        try {
            await inspectRentalOrderItem(orderId, item.orderItemId, {
                condition: form.condition.trim(),
                accessoriesStatus: form.accessoriesStatus.trim() || null,
                issueType: form.issueType || null,
                description: form.description.trim() || null,
                proposedCharge: charge,
            }, form.evidenceImages)
            await onCompleted(`Đã ghi nhận kiểm tra ${item.garment?.name || "trang phục"}.`)
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể lưu kết quả kiểm tra."))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={submit} className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 p-4">
            <h4 className="font-semibold text-[#453c38]">
                {item.garment?.name || "Trang phục"}, size {item.requestedSize}
            </h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#665b55]">
                    Tình trạng sau trả
                    <input required value={form.condition} onChange={(event) => update("condition", event.target.value)} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-semibold text-[#665b55]">
                    Phụ kiện
                    <input value={form.accessoriesStatus} onChange={(event) => update("accessoriesStatus", event.target.value)} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-semibold text-[#665b55]">
                    Loại sự cố
                    <select value={form.issueType} onChange={(event) => update("issueType", event.target.value)} className={`${inputClass} mt-2`}>
                        <option value="">Không có sự cố</option>
                        <option value="STAIN">Vết bẩn</option>
                        <option value="DAMAGE">Hư hỏng</option>
                        <option value="SEVERE_DAMAGE">Hư hỏng nghiêm trọng</option>
                        <option value="MISSING_ACCESSORY">Thiếu phụ kiện</option>
                        <option value="LOST">Thất lạc</option>
                    </select>
                </label>
                <label className="text-xs font-semibold text-[#665b55]">
                    Phí đề xuất
                    <input type="number" min="0" step="1" value={form.proposedCharge} onChange={(event) => update("proposedCharge", event.target.value)} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-semibold text-[#665b55] sm:col-span-2">
                    Mô tả kiểm tra
                    <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={3} className={`${inputClass} mt-2 py-3`} />
                </label>
                <label className="rounded-xl border border-dashed border-[#d8c9bf] bg-[#fffdf9] p-3 text-xs font-semibold text-[#665b55] sm:col-span-2">
                    <span className="flex items-center gap-2"><ImagePlus size={16} className="text-[#b65e56]" />Ảnh bằng chứng {charge > 0 ? "*" : "(không bắt buộc)"}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple required={charge > 0} onChange={(event) => update("evidenceImages", Array.from(event.target.files ?? []).slice(0, 5))} className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#fbe2de] file:px-3 file:py-2 file:font-semibold file:text-[#9b4d47]" />
                    <span className="mt-2 block font-normal text-[#897d77]">JPG, PNG hoặc WEBP · tối đa 5 ảnh · 5MB mỗi ảnh{form.evidenceImages.length ? ` · đã chọn ${form.evidenceImages.length} ảnh` : ""}</span>
                </label>
            </div>
            {chargeEvidenceMissing && (
                <p className="mt-3 text-sm text-red-600">
                    Khi đề xuất phí phải chọn sự cố, nhập mô tả và ảnh bằng chứng.
                </p>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting || chargeEvidenceMissing || !form.condition.trim()} className={`${actionButtonClass} mt-4`}>
                {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <ScanSearch size={17} />}
                Lưu kết quả kiểm tra
            </button>
        </form>
    )
}

function SettlementActions({ order, onCompleted }) {
    const [submitting, setSubmitting] = useState(false)
    const [confirmingPayment, setConfirmingPayment] = useState(false)
    const [error, setError] = useState("")
    const additionalPayment = Number(order.additionalPayment)

    const propose = async () => {
        setSubmitting(true)
        setError("")
        try {
            const result = await settleRentalOrder(order.orderId)
            const message = result.requiresManagerApproval
                ? "Đã gửi đề xuất phí tới Manager phê duyệt."
                : "Đã ghi nhận đề xuất quyết toán theo chính sách."
            await onCompleted(message)
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể đề xuất quyết toán."))
        } finally {
            setSubmitting(false)
        }
    }

    const confirmPayment = async () => {
        setConfirmingPayment(true)
        setError("")
        try {
            await confirmDirectAdditionalPayment(order.orderId, additionalPayment)
            await onCompleted("Đã xác nhận khoản thanh toán bổ sung trực tiếp.")
        } catch (requestError) {
            setError(getApiMessage(requestError, "Không thể xác nhận thanh toán bổ sung."))
        } finally {
            setConfirmingPayment(false)
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm leading-6 text-[#766b66]">
                Hệ thống tổng hợp phí trả trễ và kết quả kiểm tra. Staff chỉ đề xuất phí; khoản cần duyệt do Manager xử lý.
            </p>
            {additionalPayment > 0 && (
                <div className="rounded-xl border border-[#eadfd6] bg-[#faf6ef]/60 p-4">
                    <p className="text-sm text-[#665b55]">Khoản Customer cần thanh toán bổ sung</p>
                    <p className="mt-1 text-xl font-bold text-[#b65e56]">{formatCurrency(additionalPayment)}</p>
                    <button type="button" onClick={confirmPayment} disabled={confirmingPayment} className={`${actionButtonClass} mt-4`}>
                        {confirmingPayment ? <LoaderCircle size={17} className="animate-spin" /> : <HandCoins size={17} />}
                        Xác nhận đã thu trực tiếp
                    </button>
                </div>
            )}
            {additionalPayment <= 0 && (
                <button type="button" onClick={propose} disabled={submitting || confirmingPayment} className={actionButtonClass}>
                    {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <ClipboardCheck size={17} />}
                    Đề xuất quyết toán
                </button>
            )}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
    )
}

function StaffOrderActions({ order, onCompleted }) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const uninspectedItems = order.items.filter((item) => !item.inspectionResult)

    const simpleAction = async (action, successMessage, fallback) => {
        setSubmitting(true)
        setError("")
        try {
            await action(order.orderId)
            await onCompleted(successMessage)
        } catch (requestError) {
            setError(getApiMessage(requestError, fallback))
        } finally {
            setSubmitting(false)
        }
    }

    let title = "Thao tác vận hành"
    let icon = ClipboardCheck
    let content = (
        <p className="text-sm text-[#897d77]">
            Đơn hiện không có thao tác dành cho Rental Staff.
        </p>
    )

    if (order.status === "CONFIRMED") {
        title = "Chuẩn bị đơn"
        icon = PackageCheck
        content = (
            <div>
                <p className="mb-4 text-sm leading-6 text-[#766b66]">
                    Bắt đầu quy trình chuẩn bị và kiểm tra từng RentalUnit của đơn.
                </p>
                <button type="button" onClick={() => simpleAction(startPreparingRentalOrder, "Đơn đã chuyển sang đang chuẩn bị.", "Không thể bắt đầu chuẩn bị đơn.")} disabled={submitting} className={actionButtonClass}>
                    {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <PackageCheck size={17} />}
                    Bắt đầu chuẩn bị
                </button>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
        )
    } else if (order.status === "PREPARING") {
        title = "Chuẩn bị từng RentalUnit"
        icon = PackageCheck
        content = <><PreparationForm order={order} onCompleted={onCompleted} /><PreHandoverExceptions order={order} onCompleted={onCompleted} /></>
    } else if (order.status === "READY_FOR_PICKUP") {
        title = "Bàn giao & thu cọc"
        icon = HandCoins
        content = <><HandoverForm order={order} onCompleted={onCompleted} /><PreHandoverExceptions order={order} onCompleted={onCompleted} /><NoShowAction order={order} onCompleted={onCompleted} /></>
    } else if (["RENTING", "OVERDUE"].includes(order.status)) {
        title = "Nhận trả trang phục"
        icon = ScanSearch
        content = (
            <div>
                <p className="mb-4 text-sm leading-6 text-[#766b66]">
                    Cửa hàng tiếp nhận trả đồ trong khung giờ 08:00 đến 18:00.
                </p>
                <button type="button" onClick={() => simpleAction(receiveRentalReturn, "Đã ghi nhận Customer trả trang phục.", "Không thể ghi nhận trả trang phục.")} disabled={submitting} className={actionButtonClass}>
                    {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <ScanSearch size={17} />}
                    Xác nhận nhận trả
                </button>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
        )
    } else if (order.status === "INSPECTING") {
        title = "Kiểm tra trang phục thủ công"
        icon = ScanSearch
        content = (
            <div className="space-y-4">
                {uninspectedItems.map((item) => (
                    <InspectionItemForm key={item.orderItemId} orderId={order.orderId} item={item} onCompleted={onCompleted} />
                ))}
                {!uninspectedItems.length && (
                    <p className="rounded-xl bg-[#d4e7dd]/45 p-4 text-sm text-[#46675b]">
                        Tất cả trang phục đã được kiểm tra.
                    </p>
                )}
            </div>
        )
    } else if (order.status === "RETURNED") {
        title = "Chờ kiểm tra trang phục"
        icon = ScanSearch
        content = (
            <p className="text-sm text-[#766b66]">
                Đơn đã ghi nhận trả và đang chờ hệ thống chuyển sang bước kiểm tra.
            </p>
        )
    } else if (order.status === "SETTLEMENT_PENDING") {
        title = "Quyết toán"
        icon = ClipboardCheck
        content = <SettlementActions order={order} onCompleted={onCompleted} />
    }

    const Icon = icon

    return (
        <section className="rounded-2xl border border-[#e6c9c4] bg-[#fffdf9] p-5 sm:p-7" aria-labelledby="staff-order-action-title">
            <div className="mb-5 flex items-center gap-3 border-b border-[#eadfd6] pb-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbe2de] text-[#a9544d]">
                    <Icon size={20} strokeWidth={1.8} />
                </span>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a9544d]">
                        Rental Staff
                    </p>
                    <h2 id="staff-order-action-title" className="mt-1 text-lg font-bold text-[#453c38]">
                        {title}
                    </h2>
                </div>
            </div>
            {content}
        </section>
    )
}

export default StaffOrderActions
