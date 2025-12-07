import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../ui/Icon'

type Props = {
    onClose: () => void
}

export function CalculatorModal({ onClose }: Props) {
    const [display, setDisplay] = useState('0')
    const [equation, setEquation] = useState('')
    const [history, setHistory] = useState<string[]>([])
    const [newNumber, setNewNumber] = useState(true)

    const handleNumber = useCallback((n: string) => {
        setDisplay(prev => {
            if (newNumber) return n
            return prev === '0' ? n : prev + n
        })
        setNewNumber(false)
    }, [newNumber])

    const handleOperator = useCallback((op: string) => {
        setEquation(display + ' ' + op + ' ')
        setNewNumber(true)
    }, [display])

    const handleEqual = useCallback(() => {
        try {
            // Replace visual operators with JS operators
            const expr = (equation + display)
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '.')

            // eslint-disable-next-line
            const result = new Function('return ' + expr)()

            const formattedResult = String(result)
            setDisplay(formattedResult)
            setHistory(prev => [...prev.slice(-4), `${equation} ${display} = ${formattedResult}`])
            setEquation('')
            setNewNumber(true)
        } catch {
            setDisplay('Erro')
            setEquation('')
            setNewNumber(true)
        }
    }, [display, equation])

    const handleClear = useCallback(() => {
        setDisplay('0')
        setEquation('')
        setNewNumber(true)
    }, [])

    const handleBackspace = useCallback(() => {
        setDisplay(prev => {
            if (prev.length === 1 || newNumber) return '0'
            return prev.slice(0, -1)
        })
    }, [newNumber])

    const handlePercent = useCallback(() => {
        try {
            const val = parseFloat(display)
            setDisplay(String(val / 100))
        } catch { }
    }, [display])

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key

            if (/[0-9]/.test(key)) handleNumber(key)
            if (key === '.') handleNumber('.')
            if (key === ',') handleNumber('.')
            if (key === '+') handleOperator('+')
            if (key === '-') handleOperator('-')
            if (key === '*') handleOperator('*')
            if (key === '/') handleOperator('/')
            if (key === 'Enter' || key === '=') {
                e.preventDefault() // prevent form submission if any
                handleEqual()
            }
            if (key === 'Escape') onClose()
            if (key === 'Backspace') handleBackspace()
            if (key === 'Delete') handleClear()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNumber, handleOperator, handleEqual, onClose, handleBackspace, handleClear])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[320px] overflow-hidden border border-gray-700 font-sans">
                {/* Header */}
                <div className="bg-gray-800/50 p-2 flex justify-between items-center select-none cursor-move">
                    <div className="flex gap-2 px-2">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-sm transition-colors"></button>
                        <button onClick={() => { }} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-sm transition-colors"></button>
                        <button onClick={() => { }} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 shadow-sm transition-colors"></button>
                    </div>
                </div>

                {/* Display */}
                <div className="p-6 text-right space-y-1">
                    <div className="text-gray-400 text-sm h-5 font-mono tracking-wider overflow-hidden text-ellipsis whitespace-nowrap">
                        {equation}
                    </div>
                    <div className="text-4xl text-white font-light tracking-wide overflow-x-auto scrollbar-hide">
                        {display}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-3 p-4 bg-gray-900">
                    <button onClick={handleClear} className="h-14 rounded-full bg-gray-300 hover:bg-white text-black font-medium text-lg transition-all active:scale-95">AC</button>
                    <button onClick={handleBackspace} className="h-14 rounded-full bg-gray-300 hover:bg-white text-black font-medium text-lg transition-all active:scale-95 flex items-center justify-center">
                        <Icon name="trash" className="w-5 h-5" />
                    </button>
                    <button onClick={handlePercent} className="h-14 rounded-full bg-gray-300 hover:bg-white text-black font-medium text-lg transition-all active:scale-95">%</button>
                    <button onClick={() => handleOperator('/')} className="h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium text-2xl transition-all active:scale-95">÷</button>

                    <button onClick={() => handleNumber('7')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">7</button>
                    <button onClick={() => handleNumber('8')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">8</button>
                    <button onClick={() => handleNumber('9')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">9</button>
                    <button onClick={() => handleOperator('*')} className="h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium text-xl transition-all active:scale-95">×</button>

                    <button onClick={() => handleNumber('4')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">4</button>
                    <button onClick={() => handleNumber('5')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">5</button>
                    <button onClick={() => handleNumber('6')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">6</button>
                    <button onClick={() => handleOperator('-')} className="h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium text-2xl transition-all active:scale-95">−</button>

                    <button onClick={() => handleNumber('1')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">1</button>
                    <button onClick={() => handleNumber('2')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">2</button>
                    <button onClick={() => handleNumber('3')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">3</button>
                    <button onClick={() => handleOperator('+')} className="h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium text-2xl transition-all active:scale-95">+</button>

                    <button onClick={() => handleNumber('0')} className="col-span-2 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl text-left pl-7 transition-all active:scale-95">0</button>
                    <button onClick={() => handleNumber('.')} className="h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-medium text-xl transition-all active:scale-95">,</button>
                    <button onClick={handleEqual} className="h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium text-2xl transition-all active:scale-95">=</button>
                </div>
            </div>
        </div>
    )
}
