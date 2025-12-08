import React from 'react'

type Props = { name: string; className?: string; title?: string }

export function Icon({ name, className, title }: Props) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', role: 'img', 'aria-hidden': title ? undefined : true, 'aria-label': title }
  switch (name) {
    case 'add':
      return (<svg {...common} className={className}><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" /></svg>)
    case 'edit':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83l3.75 3.75l1.84-1.82z" /></svg>)
    case 'trash':
      return (<svg {...common} className={className}><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>)
    case 'search':
      return (<svg {...common} className={className}><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5l1.5-1.5l-5-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z" /></svg>)
    case 'calculator':
      return (<svg {...common} className={className}><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h2v2H7v-2zm12 8H7v-2h2v2h2v-2h2v2h2v-2h2v2zm-4-4h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 4h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 4h2v2h-2v-2z" /></svg>)
    case 'calendar-primary':
      return (<svg {...common} className={className}><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2zm0 15H5V10h14v9zm0-11H5V6h14v2z" /></svg>)
    case 'dashboard':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>)
    case 'calendar':
      return (<svg {...common} className={className}><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 7H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z" /></svg>)
    case 'schedule':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 8v5l4 2l1-1l-3-1V8zM4 4h8l2 2h6v14H4z" /></svg>)
    case 'ledger':
      return (<svg {...common} className={className}><path fill="currentColor" d="M5 3h14v18H5V3zm2 4h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" /></svg>)
    case 'accounts':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 3l9 6v12H3V9l9-6zm0 3.3L6 10v8h12v-8l-6-3.7z" /></svg>)
    case 'transfer':
      return (<svg {...common} className={className}><path fill="currentColor" d="M4 7h10l-2.5-2.5L13 3l5 5l-5 5l-1.5-1.5L14 9H4V7zm16 10H10l2.5 2.5L11 21l-5-5l5-5l1.5 1.5L10 15h10v2z" /></svg>)
    case 'reports':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3 13h4v8H3v-8zm6-6h4v14H9V7zm6 3h4v11h-4V10z" /></svg>)
    case 'settings':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zm8.14 4a7.9 7.9 0 0 0-.22-1.76l2.12-1.65l-2-3.46l-2.58 1a8.23 8.23 0 0 0-3-1.74l-.4-2.7h-4l-.4 2.7a8.23 8.23 0 0 0-3 1.74l-2.58-1l-2 3.46l2.12 1.65A7.9 7.9 0 0 0 3.86 12a7.9 7.9 0 0 0 .22 1.76l-2.12 1.65l2 3.46l2.58-1a8.23 8.23 0 0 0 3 1.74l.4 2.7h4l.4-2.7a8.23 8.23 0 0 0 3-1.74l2.58 1l2-3.46l-2.12-1.65c.14-.58.22-1.18.22-1.76z" /></svg>)
    case 'logout':
      return (<svg {...common} className={className}><path fill="currentColor" d="M10 17v-3H3v-4h7V7l5 5l-5 5zM19 3h-6v2h6v14h-6v2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" /></svg>)
    case 'chevron-right':
      return (<svg {...common} className={className}><path fill="currentColor" d="M9 6l6 6l-6 6V6z" /></svg>)
    case 'chevron-down':
      return (<svg {...common} className={className}><path fill="currentColor" d="M6 9l6 6l6-6H6z" /></svg>)
    case 'minus':
      return (<svg {...common} className={className}><path fill="currentColor" d="M5 11h14v2H5z" /></svg>)
    case 'out':
      return (<svg {...common} className={className}><path fill="currentColor" d="M4 7h10l-2.5-2.5L13 3l5 5l-5 5l-1.5-1.5L14 9H4V7z" /></svg>)
    case 'in':
      return (<svg {...common} className={className}><path fill="currentColor" d="M4 17h10l-2.5 2.5L13 21l5-5l-5-5l-1.5 1.5L14 15H4v2z" /></svg>)
    case 'deposit':
      return (<svg {...common} className={className}><path fill="currentColor" d="M11 3h2v6h6v2h-6v6h-2v-6H5V9h6z" /></svg>)
    case 'withdraw':
      return (<svg {...common} className={className}><path fill="currentColor" d="M19 13H5v-2h14v2z" /></svg>)
    case 'group':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5S7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" /></svg>)
    case 'commitment':
      return (<svg {...common} className={className}><path fill="currentColor" d="M5 3h14v18H5V3zm4 5H8v2h1V8zm0 4H8v2h1v-2zm0 4H8v2h1v-2zm3-8h5v2h-5V8zm0 4h5v2h-5v-2zm0 4h5v2h-5v-2z" /></svg>)
    case 'clients':
      return (<svg {...common} className={className}><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5S5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-2.66-5.33-4-8-4zm8 0c-.29 0-.62.02-.97.06c1.61.9 2.97 2.3 2.97 3.94V19h6v-2c0-2.66-5.33-4-8-4z" /></svg>)
    case 'file-text':
      return (<svg {...common} className={className}><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /></svg>)
    case 'excel':
      return (
        <svg {...common} className={className}>
          <path fill="currentColor" fillOpacity="0.2" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
          <path fill="currentColor" d="M14 2V8h6M6 20V4h7v5h5v11H6z" />
          <text x="12" y="17" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">CSV</text>
        </svg>
      )
    case 'pdf':
      return (
        <svg {...common} className={className}>
          <path fill="currentColor" fillOpacity="0.2" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
          <path fill="currentColor" d="M14 2V8h6M6 20V4h7v5h5v11H6z" />
          <text x="12" y="17" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">PDF</text>
        </svg>
      )
    case 'copy':
      return (<svg {...common} className={className}><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>)
    case 'x':
      return (<svg {...common} className={className}><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>)
    case 'undo':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>)
    case 'skip':
      return (<svg {...common} className={className}><path fill="currentColor" d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" /></svg>)
    case 'notes':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z" /></svg>) // Simple list/notes icon
    case 'user':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>)
    default:
      return (<svg {...common} className={className}><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>)
  }
}
