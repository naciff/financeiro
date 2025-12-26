import React, { useRef, useState } from 'react'
import { Icon } from './Icon'
import { uploadFile } from '../../utils/upload'

interface Props {
    label: string
    value: string
    onChange: (url: string) => void
    bucket?: string
}

export function ImageUploadInput({ label, value, onChange, bucket = 'logos' }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const url = await uploadFile(file, bucket)
            if (url) {
                onChange(url)
            }
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium ml-1 block">{label}</span>
            <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-16 h-16 border rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                    {value ? (
                        <>
                            <img src={value} alt="Logo" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                onClick={() => onChange('')}
                                title="Remover imagem"
                            >
                                <Icon name="trash" className="w-5 h-5 text-white" />
                            </div>
                        </>
                    ) : (
                        <Icon name="image" className="w-6 h-6 text-gray-400" />
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all peer pt-2 pb-2 pl-3"
                            placeholder="URL da imagem ou upload..."
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            disabled={uploading}
                        />
                    </div>
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {uploading ? (
                                <>
                                    <Icon name="refresh" className="w-3 h-3 animate-spin" /> Uploading...
                                </>
                            ) : (
                                <>
                                    <Icon name="upload" className="w-3 h-3" /> Fazer Upload da Imagem
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
