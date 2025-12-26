import { supabase } from '../lib/supabase'

export const sendEmail = async (orgId: string, to: string, subject: string, html: string, attachments?: string[]): Promise<{ success: boolean, error?: string }> => {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' }

    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                org_id: orgId,
                to,
                subject,
                html,
                attachments
            }
        })

        if (error) {
            console.error('Edge Function Error:', error)
            return { success: false, error: error.message }
        }

        if (data?.error) {
            console.error('Email Send Error:', data.error)
            return { success: false, error: data.error }
        }

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
