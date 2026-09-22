const isSafeChatUrl = (href) => {
    if (typeof href !== 'string' || !href.trim()) return false

    try {
        const url = new URL(href)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

export { isSafeChatUrl }
