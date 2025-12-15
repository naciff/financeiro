import React, { useEffect, useRef } from 'react'
import { Icon } from './Icon'

type Props = {
    value: string
    onChange: (html: string) => void
    placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
    const contentRef = useRef<HTMLDivElement>(null)

    // Sync value to innerHTML only if different (to avoid cursor jumping)
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== value) {
            if (value === '' && contentRef.current.innerHTML === '<br>') return // Ignore empty br
            contentRef.current.innerHTML = value
        }
    }, [value])

    function exec(command: string, arg?: string) {
        document.execCommand(command, false, arg)
    }

    return (
        <div className="border dark:border-gray-600 rounded bg-white dark:bg-gray-700 overflow-hidden flex flex-col h-48 focus-within:ring-2 focus-within:ring-blue-500">
            <div className="flex items-center gap-1 p-2 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <button type="button" onClick={() => exec('bold')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" title="Negrito">
                    <span className="font-bold">B</span>
                </button>
                <button type="button" onClick={() => exec('italic')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200 italic" title="Itálico">
                    <span className="italic">I</span>
                </button>
                <button type="button" onClick={() => exec('underline')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200 underline" title="Sublinhado">
                    <span className="underline">U</span>
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <div className="relative">
                    <input
                        type="color"
                        className="w-8 h-8 p-1 cursor-pointer bg-transparent"
                        title="Cor do Texto"
                        onChange={e => exec('foreColor', e.target.value)}
                    />
                </div>
            </div>
            <div
                ref={contentRef}
                className="flex-1 p-3 outline-none overflow-y-auto text-gray-900 dark:text-gray-100"
                contentEditable
                onInput={e => onChange(e.currentTarget.innerHTML)}
                onBlur={e => onChange(e.currentTarget.innerHTML)}
                placeholder={placeholder}
                style={{ minHeight: '100px' }}
            >
            </div>
        </div>
    )
}
