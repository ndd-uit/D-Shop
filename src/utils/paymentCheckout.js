const submitCheckoutForm = (checkout, target) => {
    if (
        checkout?.method !== "POST" ||
        typeof checkout.action !== "string" ||
        !checkout.action.startsWith("https://") ||
        !checkout.fields ||
        typeof checkout.fields !== "object"
    ) {
        return false
    }

    const form = document.createElement("form")
    form.method = "POST"
    form.action = checkout.action
    form.target = target
    form.hidden = true

    Object.entries(checkout.fields).forEach(([name, value]) => {
        if (value === undefined || value === null) return

        const input = document.createElement("input")
        input.type = "hidden"
        input.name = name
        input.value = String(value)
        form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    form.remove()
    return true
}

const startPaymentCheckout = (result, { newTab = false } = {}) => {
    const target = newTab ? "_blank" : "_self"

    if (submitCheckoutForm(result?.checkout, target)) {
        return true
    }

    if (typeof result?.paymentUrl === "string" && result.paymentUrl) {
        if (newTab) {
            window.open(result.paymentUrl, "_blank", "noopener,noreferrer")
        } else {
            window.location.assign(result.paymentUrl)
        }
        return true
    }

    return false
}

export { startPaymentCheckout }
