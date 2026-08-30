import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

/**
 * Normalizes options into a standard array of { value, label } objects.
 */
const normalizeOptions = (options, placeholder) => {
    const list = []

    if (placeholder) {
        list.push({ value: "", label: placeholder })
    }

    if (!Array.isArray(options)) return list

    options.forEach((item) => {
        if (Array.isArray(item)) {
            list.push({ value: item[0], label: item[1] })
        } else if (item && typeof item === "object") {
            list.push({
                value: item.value ?? item.id ?? item.categoryId ?? "",
                label: item.label ?? item.name ?? String(item.value ?? ""),
            })
        } else if (item !== undefined && item !== null) {
            list.push({ value: item, label: String(item) })
        }
    })

    return list
}

function CustomSelect({
    value,
    onChange,
    options = [],
    placeholder = "",
    name = "",
    id,
    disabled = false,
    className = "",
    buttonClassName = "",
    ariaLabel = "Chọn tùy chọn",
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)
    const defaultId = useId()
    const selectId = id || defaultId

    const normalizedList = normalizeOptions(options, placeholder)
    const selectedOption = normalizedList.find(
        (opt) => String(opt.value) === String(value ?? ""),
    ) || normalizedList[0] || { value: "", label: placeholder || "Chọn..." }

    // Close when clicking outside
    useEffect(() => {
        if (!open) return

        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false)
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    const handleSelect = (optionValue) => {
        setOpen(false)

        if (!onChange) return

        // Support both direct value callback and form event object callback
        if (typeof onChange === "function") {
            const simulatedEvent = {
                target: {
                    name,
                    value: optionValue,
                    id: selectId,
                },
            }
            onChange(simulatedEvent, optionValue)
        }
    }

    return (
        <div
            ref={containerRef}
            className={`relative inline-block w-full text-left ${className}`}
        >
            <button
                id={selectId}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#e1d6cf] bg-brand-surface px-4 py-2.5 text-left text-sm text-brand-text outline-none transition hover:border-[#a9544d] focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 disabled:cursor-not-allowed disabled:opacity-60 ${
                    open ? "border-brand-primary ring-2 ring-brand-primary/25" : ""
                } ${buttonClassName}`}
            >
                <span className="truncate font-medium">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-500 transition-transform duration-200 ${
                        open ? "rotate-180 text-brand-text" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-labelledby={selectId}
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-[#e7ded5] bg-brand-surface p-1.5 shadow-[0_15px_40px_rgba(92,70,61,0.14)] backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2"
                >
                    {normalizedList.map((option, index) => {
                        const isSelected =
                            String(option.value) === String(value ?? "")

                        return (
                            <button
                                key={`${option.value}-${index}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelect(option.value)}
                                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                                    isSelected
                                        ? "bg-[#fbe2de] text-[#713732]"
                                        : "text-brand-text hover:bg-[#f6eee7]"
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && (
                                    <Check
                                        size={16}
                                        className="ml-2 shrink-0 text-[#a9544d]"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default CustomSelect
