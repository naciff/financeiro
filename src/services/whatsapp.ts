export const getWhatsAppConfig = () => {
    return {
        url: localStorage.getItem('financeiro_wa_url'),
        token: localStorage.getItem('financeiro_wa_token')
    }
}

export const sendWhatsAppMessage = async (number: string, message: string): Promise<{ success: boolean, error?: string }> => {
    const { url, token } = getWhatsAppConfig()
    if (!url || !token) {
        return { success: false, error: 'Configuração do WhatsApp não encontrada. Verifique as configurações.' }
    }

    try {
        // Handle proxy url if needed (logic copied from Settings.tsx)
        let finalUrl = url
        if (url.includes('apiconnect8.datamastersolucoes.com.br')) {
            finalUrl = url.replace('https://apiconnect8.datamastersolucoes.com.br', '/api-whatsapp')
        }

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                number: number,
                openTicket: "0",
                queueId: "0",
                body: message
            })
        })

        const data = await response.json()
        if (response.ok && !data.error) {
            return { success: true }
        } else {
            return { success: false, error: data.error || 'Erro desconhecido ao enviar WhatsApp' }
        }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erro de conexão com WhatsApp' }
    }
}
