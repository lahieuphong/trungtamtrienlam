"use client"
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

const MarkdownViewer = ({ content, className = '' }) => {
    return (
        <div className={`prose max-w-none whitespace-pre-wrap break-words dark:prose-invert ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    a: ({ node, href, children, ...props }) => {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                                {...props}
                            >
                                {children}
                            </a>
                        )
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
export default MarkdownViewer