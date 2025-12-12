import { useEffect, useRef } from 'react'
import { getDailyFinancials, getProfile } from '../services/db'
import { useAppStore } from '../store/AppStore'

// Helper to use proxy if URL matches the external API (Copied logic from Settings to keep specific)
function getProxiedUrl(url: string) {
    if (url.includes('apiconnect8.datamastersolucoes.com.br')) {
        return url.replace('https://apiconnect8.datamastersolucoes.com.br', '/api-whatsapp')
    }
    return url
}

export function useDailyAutomation() {
    const lastCheckRef = useRef<number>(0)
    const store = useAppStore()

    useEffect(() => {
        // Check every 60 seconds
        const interval = setInterval(async () => {
            const now = new Date()

            // Throttle checks
            if (now.getTime() - lastCheckRef.current < 50000) return
            lastCheckRef.current = now.getTime()

            checkAndSend()
        }, 60000)

        // Initial check on load (after a small delay to ensure hydration)
        const timer = setTimeout(checkAndSend, 5000)

        return () => {
            clearInterval(interval)
            clearTimeout(timer)
        }
    }, [])

    async function checkAndSend(force = false): Promise<{ success: boolean, message: string }> {
        // 1. Check if enabled (unless forced)
        const enabled = localStorage.getItem('financeiro_daily_active') === 'true'
        if (!enabled && !force) return { success: false, message: 'Automação desativada.' }

        // 2. Check time
        const targetTime = localStorage.getItem('financeiro_daily_time') || '08:00'
        const now = new Date()
        const [h, m] = targetTime.split(':').map(Number)
        const targetDate = new Date(now)
        targetDate.setHours(h, m, 0, 0)

        // If current time is before target time, do nothing
        // But we need to make sure we don't spam if we open it AFTER the time.
        // Logic: If Now >= TargetTime AND LastSentDate != Today, then send.
        if (!force) {
            if (now < targetDate) return { success: false, message: 'Ainda não é hora do envio.' }

            // FIX: Use local date YYYY-MM-DD instead of UTC to match user's day
            const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-') // YYYY-MM-DD
            const lastSent = localStorage.getItem('financeiro_daily_last_sent')

            if (lastSent === todayStr) {
                return { success: false, message: 'Relatório já enviado hoje.' }
            }
        }

        const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-')

        // 3. Prepare to send
        try {
            console.log('[DailyAutomation] Triggering daily report...')

            const profileRes = await getProfile()
            const phone = profileRes.data?.phone

            if (!phone) {
                console.warn('[DailyAutomation] No phone number found in profile.')
                return { success: false, message: 'Telefone não encontrado no perfil do usuário.' }
            }

            // Fetch Data
            // Fix: Pass Organization ID from store
            const orgId = store.activeOrganization || undefined
            const financialsRes = await getDailyFinancials(todayStr, orgId)
            const financials = financialsRes.data || []

            // Format Message
            const template = localStorage.getItem('financeiro_daily_template') ||
                `🗓️ Agenda do dia [dia_atual]:

[lista_lancamentos]

✨ Que seu dia seja abençoado!`

            let listText = ''
            if (financials.length === 0) {
                listText = '_Nenhum lançamento agendado para hoje._'
            } else {
                listText = financials.map(f => {
                    const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(f.valor))
                    // f.operacao comes from DB (receita/despesa)
                    const opIcon = f.operacao === 'receita' ? '🟢 Receita' : (f.operacao === 'despesa' ? '🔴 Despesa' : '🔵 ' + f.operacao)

                    // Ensure date is displayed correctly without TZ issues for visual purposes
                    const parts = f.data_vencimento.split('T')[0].split('-')
                    const dataVenc = `${parts[2]}/${parts[1]}/${parts[0]}`

                    return `🈺 ${opIcon}
🙋‍♂️ ${f.cliente?.nome || 'Sem cliente'}
🏛️ ${f.grupo?.nome || 'Sem grupo'}
🕊️ ${f.compromisso?.nome || '-'}
🕓 ${dataVenc}
💰 ${valorFmt}
📥 ${f.caixa?.nome || 'Sem caixa'}
`
                }).join('\n-------------------\n')
            }

            let finalMsg = template.replace('[dia_atual]', new Date().toLocaleDateString('pt-BR'))
            finalMsg = finalMsg.replace('[lista_lancamentos]', listText)

            // Get API Config
            const waUrl = localStorage.getItem('financeiro_wa_url') || '/api-whatsapp/api/messages/send'
            const waToken = localStorage.getItem('financeiro_wa_token')

            if (!waUrl || !waToken) {
                console.warn('[DailyAutomation] WhatsApp not configured.')
                return { success: false, message: 'WhatsApp não configurado (URL ou Token ausente).' }
            }

            // Clean Phone
            let cleanPhone = phone.replace(/\D/g, '')
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone
            }

            const finalUrl = getProxiedUrl(waUrl)

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: cleanPhone,
                    openTicket: "0",
                    queueId: "0",
                    body: finalMsg
                })
            })

            if (!response.ok) {
                const errText = await response.text()
                console.error('[DailyAutomation] API Error:', errText)
                return { success: false, message: `Erro na API do WhatsApp: ${response.status} ${response.statusText}` }
            }

            // Mark as sent
            localStorage.setItem('financeiro_daily_last_sent', todayStr)
            console.log('[DailyAutomation] Sent successfully.')

            return { success: true, message: `Relatório enviado com sucesso! (${financials.length} itens)` }

        } catch (err: any) {
            console.error('[DailyAutomation] Error:', err)
            return { success: false, message: `Erro ao processar envio: ${err.message}` }
        }
    }

    return {
        runNow: () => checkAndSend(true)
    }
}
