import React, { InputHTMLAttributes } from 'react'

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string
    bgColor?: string
}

export const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(({ label, id, className = '', bgColor = 'bg-white dark:bg-gray-800', ...props }, ref) => {
    return (
        <div className="relative">
            <input
                id={id}
                ref={ref}
                className={`
          peer block w-full appearance-none rounded border-2 border-gray-200 
          bg-transparent px-2.5 pb-2.5 pt-4 text-sm text-gray-900 
          focus:border-blue-500 focus:outline-none focus:ring-0 
          dark:border-gray-700 dark:text-white dark:focus:border-blue-500
          ${className}
        `}
                placeholder=" "
                {...props}
            />
            <label
                htmlFor={id}
                className={`
          absolute left-1 top-2 z-10 origin-[0] -translate-y-4 scale-75 transform 
          px-2 text-sm text-gray-500 duration-300 pointer-events-none
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 
          peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-500 
          dark:text-gray-400 peer-focus:dark:text-blue-500
          ${bgColor}
        `}
            >
                {label}
            </label>
        </div>
    )
})
FloatingLabelInput.displayName = 'FloatingLabelInput'

