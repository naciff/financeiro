import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../ui/Icon'

type Props = {
    onClose: () => void
}

export function CalculatorModal({ onClose }: Props) {
    const [display, setDisplay] = useState('0')
    const [equation, setEquation] = useState('')
    const [history, setHistory] = useState<string[]>([])
    // New state to track if we just finished a calculation or operation
    const [isNewNumber, setIsNewNumber] = useState(true)

    // Helper: limits display length
    const formatDisplay = (val: string) => {
        if (val.length > 16) return val.slice(0, 16)
        return val
    }

    const handleNumber = useCallback((n: string) => {
        setDisplay(prev => {
            if (isNewNumber) return n
            if (prev === '0') return n
            return formatDisplay(prev + n)
        })
        setIsNewNumber(false)
    }, [isNewNumber])

    const handleOperator = useCallback((op: string) => {
        // If we have an equation pending but just typed a number, calculate intermediate
        // Windows calc behavior: 
        // 1. Type number -> 5
        // 2. Press + -> Equation: "5 + "
        // 3. Type number -> 3
        // 4. Press * -> Equation: "5 + 3 * " (Wait, no, standard calc evaluates order immediately usually or is simple accumulator?)
        // Standard Windows calculator is immediate execution for standard mode, but shows history.
        // Actually, simple standard logic: 
        // 2 + 3 * -> shows 5 * in equation.

        let currentVal = display
        // Clean display (remove localized format if we added any, though we keep raw string here)

        setEquation(prev => {
            // If we already have an operator active and didn't type a new number, just swap operator
            if (isNewNumber && equation.endsWith(' ')) {
                return equation.slice(0, -3) + ' ' + op + ' '
            }
            // Otherwise, append
            return prev + currentVal + ' ' + op + ' '
        })

        // If there was a previous pending operation, strict standard calculator might eval it now?
        // Let's stick to simple logic: Just construct string, eval at equal.
        // But Windows Standard calc evaluates intermediate: 2 + 3 + -> displays 5, equation "5 +"
        // Let's try to simulate that intermediate evaluation if equation looks like "A op "

        if (!isNewNumber && equation && equation.endsWith(' ')) {
            try {
                const expr = (equation + display)
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/,/g, '.')
                // eslint-disable-next-line
                const res = new Function('return ' + expr)()
                setDisplay(String(res))
                setEquation(String(res) + ' ' + op + ' ')
            } catch { }
        } else if (!equation) {
            setEquation(display + ' ' + op + ' ')
        }

        setIsNewNumber(true)
    }, [display, equation, isNewNumber])

    const handleEqual = useCallback(() => {
        if (!equation) return

        try {
            // Standard calc: repeats last operation if pressed again? Ignore for now.
            // basic eval
            const expr = (equation + display)
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '.')

            // eslint-disable-next-line
            const result = new Function('return ' + expr)()
            const formattedResult = String(result)

            setDisplay(formattedResult)
            setHistory(prev => [...prev.slice(-4), `${equation}${display} =`])
            setEquation('') // Clear equation in standard calc usually
            setIsNewNumber(true)
        } catch {
            setDisplay('Erro')
            setEquation('')
            setIsNewNumber(true)
        }
    }, [display, equation])

    // Immediate operations
    const handleImmediate = (type: 'inv' | 'sqr' | 'sqrt' | 'neg' | 'pct') => {
        const val = parseFloat(display.replace(',', '.'))
        if (isNaN(val)) return

        let res = 0
        let eqPart = ''

        switch (type) {
            case 'inv':
                if (val === 0) { setDisplay('Erro'); setIsNewNumber(true); return }
                res = 1 / val
                eqPart = `1/(${val})`
                break
            case 'sqr':
                res = val * val
                eqPart = `sqr(${val})`
                break
            case 'sqrt':
                if (val < 0) { setDisplay('Erro'); setIsNewNumber(true); return }
                res = Math.sqrt(val)
                eqPart = `√(${val})`
                break
            case 'neg':
                res = -val
                break
            case 'pct':
                // Percent is tricky, depends on context. Simple mapping: /100
                res = val / 100
                eqPart = `${val}%`
                break
        }

        setDisplay(String(res))
        setIsNewNumber(true)
        // Note: Windows calc updates equation display specifically for these functions "sqr(5)", but keeps working.
        // Simplified: just update display.
    }

    const handleClearEntry = () => {
        setDisplay('0')
        setIsNewNumber(true)
    }

    const handleClear = () => {
        setDisplay('0')
        setEquation('')
        setIsNewNumber(true)
    }

    const handleBackspace = () => {
        if (isNewNumber) return
        setDisplay(prev => {
            if (prev.length <= 1) return '0'
            return prev.slice(0, -1)
        })
    }

    // Keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key
            if (/[0-9]/.test(key)) handleNumber(key)
            if (key === '.' || key === ',') handleNumber('.')
            if (key === '+') handleOperator('+')
            if (key === '-') handleOperator('-')
            if (key === '*') handleOperator('×')
            if (key === '/') handleOperator('÷')
            if (key === 'Enter' || key === '=') { e.preventDefault(); handleEqual() }
            if (key === 'Escape') onClose() // or Clear?
            if (key === 'Backspace') handleBackspace()
            if (key === 'Delete') handleClearEntry()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNumber, handleOperator, handleEqual, onClose])

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent pointer-events-none">
            {/* Window, pointer-events-auto */}
            <div className="bg-[#202020] rounded-lg shadow-2xl w-[320px] overflow-hidden border border-[#353535] font-sans pointer-events-auto flex flex-col h-[500px]">
                {/* Header / Title Bar */}
                <div className="flex justify-between items-center p-2 select-none">
                    <div className="text-white text-xs pl-2">Calculadora</div>
                    <button onClick={onClose} className="text-white hover:bg-red-600 p-2 rounded-md transition-colors">
                        <Icon name="x" className="w-4 h-4" />
                    </button>
                </div>

                {/* Display Area */}
                <div className="flex-1 p-4 flex flex-col justify-end text-right">
                    <div className="text-[#a8a8a8] text-sm h-6 overflow-hidden">
                        {equation}
                    </div>
                    <div className="text-white text-5xl font-semibold overflow-x-auto scrollbar-hide py-1">
                        {display.replace('.', ',')}
                    </div>
                </div>

                {/* Keypad Grid - 4 cols, 6 rows */}
                <div className="grid grid-cols-4 gap-[2px] bg-[#202020] p-[4px]">
                    {/* Row 1: %, CE, C, Backspace */}
                    <button onClick={() => handleImmediate('pct')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-sm flex items-center justify-center">%</button>
                    <button onClick={handleClearEntry} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-sm flex items-center justify-center">CE</button>
                    <button onClick={handleClear} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-sm flex items-center justify-center">C</button>
                    <button onClick={handleBackspace} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-sm flex items-center justify-center">
                        <Icon name="delete" className="w-4 h-4" /> {/* Or simple < back icon */}
                    </button>

                    {/* Row 2: 1/x, x^2, sqrt, div */}
                    <button onClick={() => handleImmediate('inv')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-base italic font-serif flex items-center justify-center">¹/x</button>
                    <button onClick={() => handleImmediate('sqr')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-base italic font-serif flex items-center justify-center">x²</button>
                    <button onClick={() => handleImmediate('sqrt')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-base italic font-serif flex items-center justify-center">²√x</button>
                    <button onClick={() => handleOperator('÷')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-xl flex items-center justify-center">÷</button>

                    {/* Row 3: 7, 8, 9, mul */}
                    <button onClick={() => handleNumber('7')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">7</button>
                    <button onClick={() => handleNumber('8')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">8</button>
                    <button onClick={() => handleNumber('9')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">9</button>
                    <button onClick={() => handleOperator('×')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-xl flex items-center justify-center">×</button>

                    {/* Row 4: 4, 5, 6, sub */}
                    <button onClick={() => handleNumber('4')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">4</button>
                    <button onClick={() => handleNumber('5')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">5</button>
                    <button onClick={() => handleNumber('6')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">6</button>
                    <button onClick={() => handleOperator('-')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-xl flex items-center justify-center">-</button>

                    {/* Row 5: 1, 2, 3, add */}
                    <button onClick={() => handleNumber('1')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">1</button>
                    <button onClick={() => handleNumber('2')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">2</button>
                    <button onClick={() => handleNumber('3')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">3</button>
                    <button onClick={() => handleOperator('+')} className="h-[56px] bg-[#323232] hover:bg-[#3d3d3d] text-white rounded-[4px] text-xl flex items-center justify-center">+</button>

                    {/* Row 6: +/-, 0, comma, equal */}
                    <button onClick={() => handleImmediate('neg')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">+/-</button>
                    <button onClick={() => handleNumber('0')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">0</button>
                    <button onClick={() => handleNumber('.')} className="h-[56px] bg-[#3b3b3b] hover:bg-[#323232] text-white rounded-[4px] text-xl font-semibold flex items-center justify-center">,</button>
                    <button onClick={handleEqual} className="h-[56px] bg-[#4cc2ff] hover:bg-[#4aaee6] text-black rounded-[4px] text-xl font-semibold flex items-center justify-center">=</button>
                </div>
            </div>
        </div>
    )
}
