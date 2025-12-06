import { createClient } from '@supabase/supabase-js'

function env(key, fallback) {
  return process.env[key] || process.env[`VITE_${key}`] || fallback || ''
}

const url = env('SUPABASE_URL')
const key = env('SUPABASE_KEY')

async function main() {
  const out = { ok: true, checks: [] }
  if (!url || !key) {
    out.ok = false
    out.checks.push({ name: 'env', ok: false, message: 'SUPABASE_URL/SUPABASE_KEY ausentes' })
    console.log(JSON.stringify(out, null, 2))
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const session = await supabase.auth.getSession()
  const hasSession = !!session.data.session
  out.checks.push({ name: 'session', ok: hasSession, message: hasSession ? 'Sessão válida' : 'Sessão ausente' })

  const rlsProbe = await supabase.from('accounts').select('id').limit(1)
  const rlsOk = !rlsProbe.error || !/permission/i.test(rlsProbe.error.message || '')
  out.checks.push({ name: 'rls', ok: rlsOk, message: rlsOk ? 'Consulta permitida' : 'Permissão negada (RLS)' })

  const cols = await supabase.from('accounts').select('id,tipo,dia_vencimento').limit(1)
  const colOk = !cols.error
  out.checks.push({ name: 'schema', ok: colOk, message: colOk ? 'Campo dia_vencimento disponível' : 'Campo dia_vencimento ausente' })

  const who = await supabase.auth.getUser()
  const userId = who.data.user?.id || null
  const hasRecords = userId ? !(await supabase.from('accounts').select('id').eq('user_id', userId).limit(1)).error : false
  out.checks.push({ name: 'data', ok: !!hasRecords, message: hasRecords ? 'Há registros' : 'Nenhum registro para o usuário' })

  console.log(JSON.stringify(out, null, 2))
  process.exit(out.ok ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
