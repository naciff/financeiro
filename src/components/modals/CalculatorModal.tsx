import { useState } from 'react'
import { Icon } from '../ui/Icon'

type Props = {
    onClose: () => void
}

export function CalculatorModal({ onClose }: Props) {
    const [display, setDisplay] = useState('0')
    const [equation, setEquation] = useState('')

    function handleNumber(n: string) {
        setDisplay(prev => prev === '0' ? n : prev + n)
    }

    function handleOperator(op: string) {
        setEquation(display + ' ' + op + ' ')
        setDisplay('0')
    }

    function handleEqual() {
        try {
            const expr = equation + display
            // eslint-disable-next-line no-eval
            const result = eval(expr)
            setDisplay(String(result))
            setEquation('')
        } catch {
            setDisplay('Error')
            setEquation('')
        }
    }

    function handleClear() {
        setDisplay('0')
        setEquation('')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-72 overflow-hidden">
                <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
                    <div className="font-semibold text-sm">Calculadora</div>
                    <button onClick={onClose}><Icon name="minus" className="w-4 h-4" /></button>
                </div>
                <div className="bg-gray-100 p-4 text-right border-b">
                    <div className="text-xs text-gray-500 h-4">{equation}</div>
                    <div className="text-2xl font-mono truncate">{display}</div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 bg-gray-200">
                    <button onClick={handleClear} className="col-span-3 bg-red-100 hover:bg-red-200 p-3 rounded font-bold text-red-800">C</button>
                    <button onClick={() => handleOperator('/')} className="bg-orange-100 hover:bg-orange-200 p-3 rounded font-bold text-orange-800">÷</button>

                    <button onClick={() => handleNumber('7')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">7</button>
                    <button onClick={() => handleNumber('8')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">8</button>
                    <button onClick={() => handleNumber('9')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">9</button>
                    <button onClick={() => handleOperator('*')} className="bg-orange-100 hover:bg-orange-200 p-3 rounded font-bold text-orange-800">×</button>

                    <button onClick={() => handleNumber('4')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">4</button>
                    <button onClick={() => handleNumber('5')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">5</button>
                    <button onClick={() => handleNumber('6')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">6</button>
                    <button onClick={() => handleOperator('-')} className="bg-orange-100 hover:bg-orange-200 p-3 rounded font-bold text-orange-800">-</button>

                    <button onClick={() => handleNumber('1')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">1</button>
                    <button onClick={() => handleNumber('2')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">2</button>
                    <button onClick={() => handleNumber('3')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">3</button>
                    <button onClick={() => handleOperator('+')} className="bg-orange-100 hover:bg-orange-200 p-3 rounded font-bold text-orange-800">+</button>

                    <button onClick={() => handleNumber('0')} className="col-span-2 bg-white hover:bg-gray-50 p-3 rounded font-bold">0</button>
                    <button onClick={() => handleNumber('.')} className="bg-white hover:bg-gray-50 p-3 rounded font-bold">.</button>
                    <button onClick={handleEqual} className="bg-green-500 hover:bg-green-600 p-3 rounded font-bold text-white">=</button>
                </div>
            </div>
        </div>
    )
}
