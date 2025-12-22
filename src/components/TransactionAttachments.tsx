import { useEffect, useState } from 'react'
import { Icon } from './ui/Icon'
import { listAttachments, addAttachment, deleteAttachment } from '../services/db'
import { ConfirmModal } from './ui/ConfirmModal'
import { AlertModal } from './ui/AlertModal'

type Props = {
    transactionId: string | null
    pendingAttachments?: { name: string; type: string; data: string }[]
    onPendingUpload?: (file: { name: string; type: string; data: string }) => void
    onPendingDelete?: (index: number) => void
    readOnly?: boolean
}

export function TransactionAttachments({ transactionId, pendingAttachments = [], onPendingUpload, onPendingDelete, readOnly = false }: Props) {
    const [attachments, setAttachments] = useState<any[]>([])
    const [viewingAttachment, setViewingAttachment] = useState<any>(null)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [uploading, setUploading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [idToDelete, setIdToDelete] = useState<string | null>(null)
    const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' })

    useEffect(() => {
        if (transactionId) {
            loadAttachments()
            setViewingAttachment(null) // Reset view on ID change
        } else {
            setAttachments([])
            setViewingAttachment(null)
        }
    }, [transactionId])

    async function loadAttachments() {
        if (!transactionId) return
        const r = await listAttachments(transactionId)
        if (r.data) setAttachments(r.data)
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return
        setUploading(true)
        const file = e.target.files[0]

        if (file.size > 5 * 1024 * 1024) {
            setAlertModal({ open: true, title: 'Arquivo muito grande', message: 'Arquivo muito grande. Máximo 5MB.' })
            setUploading(false)
            return
        }

        const reader = new FileReader()
        reader.onload = async () => {
            const base64 = reader.result as string

            if (transactionId) {
                try {
                    const { error } = await addAttachment({
                        transaction_id: transactionId,
                        file_name: file.name,
                        file_type: file.type,
                        file_data: base64
                    })

                    if (error) {
                        setAlertModal({ open: true, title: 'Erro', message: 'Erro ao enviar imagem: ' + error.message })
                    } else {
                        await loadAttachments()
                    }
                } catch (err: any) {
                    setAlertModal({ open: true, title: 'Erro', message: 'Erro: ' + err.message })
                } finally {
                    setUploading(false)
                }
            } else if (onPendingUpload) {
                onPendingUpload({ name: file.name, type: file.type, data: base64 })
                setUploading(false)
            }
        }
        reader.readAsDataURL(file)
    }

    async function handleDeleteAttachment(id: string) {
        setIdToDelete(id)
        setShowDeleteConfirm(true)
    }

    async function confirmDelete() {
        if (!idToDelete) return
        setShowDeleteConfirm(false)

        if (transactionId) {
            await deleteAttachment(id)
            if (viewingAttachment?.id === id) setViewingAttachment(null)
            await loadAttachments()
        }
    }

    return (
        <div className="flex flex-col h-full rounded border dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
            {/* Toolbar */}
            <div className="bg-gray-100 dark:bg-gray-700 p-2 flex items-center gap-2 border-b dark:border-gray-600">
                {!readOnly && (
                    <label className={`cursor-pointer bg-white dark:bg-gray-600 border dark:border-gray-500 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center gap-2 text-sm shadow-sm transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Icon name="upload_file" className="w-4 h-4" />
                        <span>Upload Comprovante</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                )}
                {uploading && <span className="text-xs animate-pulse text-gray-500">Enviando...</span>}

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => { setZoom(z => Math.max(0.2, z - 0.2)) }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        disabled={!viewingAttachment}
                        title="Zoom Out"
                    >
                        <Icon name="zoom_out" className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setZoom(z => Math.min(3, z + 0.2)) }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        disabled={!viewingAttachment}
                        title="Zoom In"
                    >
                        <Icon name="zoom_in" className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setRotation(r => r - 90) }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        disabled={!viewingAttachment}
                        title="Girar Esquerda"
                    >
                        <Icon name="rotate_left" className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setRotation(r => r + 90) }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        disabled={!viewingAttachment}
                        title="Girar Direita"
                    >
                        <Icon name="rotate_right" className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                    <button
                        onClick={() => {
                            if (!viewingAttachment) return
                            if (!viewingAttachment.id) return
                            const link = document.createElement('a')
                            link.href = viewingAttachment.file_data
                            link.download = viewingAttachment.file_name
                            link.click()
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-blue-600 dark:text-blue-400"
                        disabled={!viewingAttachment || !viewingAttachment.id}
                        title="Baixar"
                    >
                        <Icon name="download" className="w-5 h-5" />
                    </button>
                    {!readOnly && (
                        <button
                            onClick={() => {
                                if (!viewingAttachment) return
                                if (viewingAttachment.id) {
                                    handleDeleteAttachment(viewingAttachment.id)
                                } else if (onPendingDelete) {
                                    // Find index in pending
                                    const idx = pendingAttachments.findIndex(p => p.data === viewingAttachment.file_data)
                                    if (idx !== -1) onPendingDelete(idx)
                                }
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-red-600 dark:text-red-400"
                            disabled={!viewingAttachment}
                            title="Excluir"
                        >
                            <Icon name="delete" className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-[300px]">
                {/* Sidebar List of Attachments */}
                <div className="w-48 bg-gray-50 dark:bg-gray-750 border-r dark:border-gray-600 overflow-y-auto p-2 space-y-2 shrink-0">
                    {(attachments.length === 0 && pendingAttachments.length === 0) && <div className="text-xs text-gray-500 text-center py-4">Nenhum comprovante</div>}

                    {/* Pending Items */}
                    {pendingAttachments.map((att, idx) => (
                        <div
                            key={`pending-${idx}`}
                            onClick={() => {
                                setViewingAttachment({
                                    id: null,
                                    file_name: att.name,
                                    file_type: att.type,
                                    file_data: att.data,
                                    created_at: new Date().toISOString()
                                })
                                setZoom(1)
                                setRotation(0)
                            }}
                            className={`p-2 rounded cursor-pointer border border-dashed border-orange-300 bg-orange-50 hover:border-orange-400 dark:bg-orange-900/20 dark:border-orange-500 flex flex-col gap-1 transition-all ${viewingAttachment?.file_data === att.data ? 'ring-2 ring-orange-400' : ''}`}
                        >
                            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                                {att.type.startsWith('image/') ? (
                                    <img src={att.data} alt="" className="w-full h-full object-cover opacity-70" />
                                ) : (
                                    <Icon name="description" className="w-8 h-8 text-gray-400" />
                                )}
                            </div>
                            <div className="text-[10px] truncate font-medium text-orange-700 dark:text-orange-300" title={att.name}>{att.name} (Novo)</div>
                            <div className="text-[9px] text-gray-400">Pendente</div>
                        </div>
                    ))}

                    {/* Saved Items */}
                    {attachments.map(att => (
                        <div
                            key={att.id}
                            onClick={() => {
                                setViewingAttachment(att)
                                setZoom(1)
                                setRotation(0)
                            }}
                            className={`p-2 rounded cursor-pointer border hover:bg-blue-50 dark:hover:bg-gray-700 flex flex-col gap-1 transition-all ${viewingAttachment?.id === att.id ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 dark:bg-gray-700 dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                        >
                            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center overflow-hidden">
                                {att.file_type.startsWith('image/') ? (
                                    <img src={att.file_data} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="description" className="w-8 h-8 text-gray-500" />
                                )}
                            </div>
                            <div className="text-[10px] truncate font-medium dark:text-gray-200" title={att.file_name}>{att.file_name}</div>
                            <div className="text-[9px] text-gray-400">{new Date(att.created_at).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>

                {/* Main Viewer */}
                <div className="flex-1 bg-gray-200 dark:bg-gray-900 flex items-center justify-center overflow-hidden relative">
                    {viewingAttachment ? (
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                            {viewingAttachment.file_type.startsWith('image/') ? (
                                <img
                                    src={viewingAttachment.file_data}
                                    alt="Visualização"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transition: 'transform 0.2s ease-out',
                                        maxWidth: '100%',
                                        maxHeight: '100%'
                                    }}
                                    className="shadow-lg pointer-events-none"
                                />
                            ) : (
                                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
                                    <Icon name="description" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <div className="text-lg font-medium mb-2 dark:text-gray-200">{viewingAttachment.file_name}</div>
                                    <div className="text-sm text-gray-500 mb-4">{viewingAttachment.file_type}</div>
                                    <a
                                        href={viewingAttachment.file_data}
                                        download={viewingAttachment.file_name}
                                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Baixar Arquivo
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <Icon name="image" className="w-12 h-12 mb-2 opacity-20" />
                            <span className="opacity-50">Selecione um comprovante para visualizar</span>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setIdToDelete(null) }}
                onConfirm={confirmDelete}
                title="Excluir Comprovante"
                message="Tem certeza que deseja excluir este comprovante?"
            />

            <AlertModal
                isOpen={alertModal.open}
                title={alertModal.title}
                message={alertModal.message}
                onClose={() => setAlertModal({ ...alertModal, open: false })}
            />
        </div>
    )
}
