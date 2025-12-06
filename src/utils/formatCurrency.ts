/**
 * Formats a number as Brazilian currency (R$)
 * @param value - Number to format
 * @returns Formatted string with thousand separator (.) and decimal separator (,)
 * @example formatCurrency(10000) => "10.000,00"
 */
export function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}
