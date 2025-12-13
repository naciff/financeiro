
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Icon } from '../components/ui/Icon'

export default function Profile() {
    const { session } = useAuth()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // Form fields
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')

    function formatPhone(v: string) {
        v = v.replace(/\D/g, "")
        if (v.length > 11) v = v.slice(0, 11)

        if (v.length > 10) {
            return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
        } else if (v.length > 5) {
            return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
        } else if (v.length > 2) {
            return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2")
        }
        return v
    }

    useEffect(() => {
        if (session) {
            getProfile()
        }
    }, [session])

    async function getProfile() {
        if (!supabase) return
        try {
            setLoading(true)
            const { user } = session!

            const { data, error, status } = await supabase
                .from('profiles')
                .select(`name, avatar_url, phone, email`)
                .eq('id', user.id)
                .single()

            if (error && status !== 406) {
                throw error
            }

            if (data) {
                setName(data.name || '')
                setAvatarUrl(data.avatar_url)
                setPhone(formatPhone(data.phone || ''))
                // If email in profile is empty, fallback to auth email
                setEmail(data.email || user.email || '')
            } else {
                // If no profile exists yet (should exist via trigger, but just in case), prepopulate email
                setEmail(user.email || '')
            }
        } catch (error) {
            console.error('Error loading user data!', error)
        } finally {
            setLoading(false)
        }
    }

    async function updateProfile(e: React.FormEvent) {
        e.preventDefault()
        if (!supabase) return

        try {
            setLoading(true)
            const { user } = session!

            const updates = {
                id: user.id,
                name,
                phone: phone.replace(/\D/g, ''), // Save only digits
                email,
                updated_at: new Date().toISOString(),
            }

            const { error } = await supabase.from('profiles').upsert(updates)

            if (error) {
                throw error
            }
            alert('Perfil atualizado!')
        } catch (error) {
            alert('Erro ao atualizar perfil!')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function downloadImage(path: string) {
        if (!supabase) return
        try {
            const { data, error } = await supabase.storage.from('avatars').download(path)
            if (error) {
                throw error
            }
            const url = URL.createObjectURL(data)
            setAvatarUrl(url)
        } catch (error) {
            console.log('Error downloading image: ', error)
        }
    }

    // Effect to load image URL if we have a path but it's not a full URL
    useEffect(() => {
        if (avatarUrl && !avatarUrl.startsWith('blob:') && !avatarUrl.startsWith('http')) {
            downloadImage(avatarUrl)
        }
    }, [avatarUrl])


    async function uploadAvatar(event: any) {
        if (!supabase) return
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Update profile with new avatar path
            const { user } = session!
            const { error: updateError } = await supabase.from('profiles').upsert({
                id: user.id,
                avatar_url: filePath,
                updated_at: new Date().toISOString()
            })

            if (updateError) {
                throw updateError
            }

            setAvatarUrl(filePath)
            alert('Foto atualizada!')
        } catch (error) {
            alert('Erro ao carregar imagem!')
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
            <h1 className="text-xl font-semibold mb-6 pb-2 border-b dark:border-gray-700 text-gray-900 dark:text-gray-100">Meu Perfil</h1>

            <form onSubmit={updateProfile} className="space-y-6">

                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border dark:border-gray-600">
                        {avatarUrl ? (
                            (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) ?
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
                                <Icon name="user" className="w-12 h-12 text-gray-400" />
                        ) : (
                            <Icon name="user" className="w-12 h-12 text-gray-400" />
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">
                            {uploading ? 'Enviando...' : 'Alterar foto'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={uploadAvatar}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Seu nome completo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            placeholder="seu@email.com"
                            disabled
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Para alterar seu email de login, entre em contato com o suporte.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Celular</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black dark:bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 dark:hover:bg-black transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    )
}
