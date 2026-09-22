import ReactMarkdown from 'react-markdown'

import { isSafeChatUrl } from './chatMarkdown.js'

const markdownComponents = {
    p: ({ children }) => (
        <p className={'mb-2 whitespace-pre-wrap break-words last:mb-0'}>
            {children}
        </p>
    ),
    strong: ({ children }) => (
        <strong className={'font-semibold text-[#4f3933]'}>{children}</strong>
    ),
    h1: ({ children }) => (
        <h3 className={'mb-2 mt-3 text-sm font-bold text-[#4f3933] first:mt-0'}>
            {children}
        </h3>
    ),
    h2: ({ children }) => (
        <h3 className={'mb-2 mt-3 text-sm font-bold text-[#4f3933] first:mt-0'}>
            {children}
        </h3>
    ),
    h3: ({ children }) => (
        <h3 className={'mb-2 mt-3 text-sm font-bold text-[#4f3933] first:mt-0'}>
            {children}
        </h3>
    ),
    ul: ({ children }) => (
        <ul className={'my-2 list-disc space-y-1 pl-5 marker:text-[#a9544d]'}>
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className={'my-2 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-[#7b3833]'}>
            {children}
        </ol>
    ),
    li: ({ children }) => <li className={'pl-0.5'}>{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className={'my-2 border-l-2 border-[#d99a93] pl-3 text-[#67534d]'}>
            {children}
        </blockquote>
    ),
    code: ({ children }) => (
        <code className={'rounded bg-[#f5eee8] px-1 py-0.5 font-mono text-[0.92em] text-[#7b3833]'}>
            {children}
        </code>
    ),
    a: ({ children, href }) => {
        if (!isSafeChatUrl(href)) {
            return <span>{children}</span>
        }

        return (
            <a
                href={href}
                target={'_blank'}
                rel={'noopener noreferrer'}
                className={'font-semibold text-[#8f443e] underline decoration-[#d99a93] underline-offset-2 hover:text-[#713530] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9544d]'}
            >
                {children}
            </a>
        )
    },
}

function SafeChatMarkdown({ content }) {
    return (
        <div className={'min-w-0 break-words'}>
            <ReactMarkdown skipHtml components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </div>
    )
}

export default SafeChatMarkdown
