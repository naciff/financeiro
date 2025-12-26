import { supabase } from '../lib/supabase'

export async function uploadFile(file: File | Blob, bucket: string = 'logos', path?: string, customFileName?: string): Promise<string | null> {
    if (!supabase) {
        console.error('Supabase client not initialized')
        alert('Erro: Cliente Supabase não inicializado. Verifique as variáveis de ambiente (VITE_SUPABASE_URL).')
        return null
    }

    try {
        let fileName = customFileName
        if (!fileName) {
            const fileExt = (file as File).name ? (file as File).name.split('.').pop() : 'bin'
            fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        }

        const filePath = path ? `${path}/${fileName}` : fileName


        // Debug: Check if we can access the bucket
        const { error: listError } = await supabase.storage.from(bucket).list()
        if (listError) {
            console.error('Debug: Cannot list bucket:', listError)
            alert(`Erro de Permissão/Acesso: Não foi possível acessar o bucket "${bucket}". Detalhes: ${listError.message}`)
            return null
        }

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Error uploading file:', uploadError)
            alert(`Erro ao fazer upload do arquivo: ${uploadError.message || JSON.stringify(uploadError)}. Verifique se o bucket "${bucket}" existe.`)
            return null
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
        return data.publicUrl
    } catch (error: any) {
        console.error('Error in uploadFile helper:', error)
        alert(`Erro sistemico no upload: ${error.message || error}`)
        return null
    }
}

