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
    case 'check':
      return (<svg {...common} className={className}><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>)
    case 'clock':
      return (<svg {...common} className={className}><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>)
    case 'printer':
      return (<svg {...common} className={className}><path fill="currentColor" d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-4h8v2zm2-2v-2H6v2H4v-4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4h-2z" /><circle cx="18" cy="11.5" r="1" fill="currentColor" /></svg>)
    case 'list':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>)
    case 'dollar':
      return (<svg {...common} className={className}><path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>)
    case 'message-circle':
      return (<svg {...common} className={className}><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" /></svg>)
    case 'send':
      return (<svg {...common} className={className}><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>)
    case 'whatsapp':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zM12.05 20.21c-1.46 0-2.9-.39-4.18-1.15l-.3-.18l-3.11.82l.83-3.03l-.19-.31a8.191 8.191 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24c2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.22-8.26 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81c-.23-.08-.39-.12-.56.12c-.17.25-.64.81-.78.97c-.14.17-.29.19-.54.06c-.25-.12-1.05-.39-1.99-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.14-.25-.02-.38.11-.51c.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31c-.22.25-.86.85-.86 2.07c0 1.22.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74c.59.26 1.05.41 1.43.53c.64.21 1.23.18 1.7.11c.53-.07 1.47-.6 1.67-1.18c.21-.58.21-1.07.14-1.18c-.07-.11-.22-.18-.47-.3z" /></svg>)
    case 'star':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z" /></svg>)
    case 'eye':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z" /></svg>)
    case 'eye-off':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.45-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28l.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22L21 20.73L3.27 3L2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65c0 1.66 1.34 3 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53c-2.76 0-5-2.24-5-5c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15l.02-.16c0-1.66-1.34-3-3-3l-.17.01z" /></svg>)
    case 'database':
      return (<svg {...common} className={className}><path fill="currentColor" d="M12 2C6.48 2 2 4.02 2 6.5S6.48 11 12 11s10-2.02 10-4.5S17.52 2 12 2zm0 18c-5.52 0-10-2.02-10-4.5v-9c0 .68.32 1.33.88 1.92c1.47 1.56 4.96 2.58 9.12 2.58s7.65-1.02 9.12-2.58c.56-.59.88-1.24.88-1.92v9c0 2.48-4.48 4.5-10 4.5zM12 13c-5.52 0-10-2.02-10-4.5v3c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-3c0 2.48-4.48 4.5-10 4.5z" /></svg>)
    case 'briefcase':
      return (<svg {...common} className={className}><path fill="currentColor" d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>)
    case 'wallet':
      return (<svg {...common} className={className}><path fill="currentColor" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>)
    case 'play':
      return (<svg {...common} className={className}><path fill="currentColor" d="M8 5v14l11-7z" /></svg>)
    case 'link':
      return (<svg {...common} className={className}><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>)
    default:
      return (<svg {...common} className={className}><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>)
  }
}
