import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/10 border-green-500/30',
      text: 'text-green-400',
      iconColor: 'text-green-500'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      text: 'text-yellow-400',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-400',
      iconColor: 'text-blue-500'
    }
  }

  const { icon: Icon, bg, text, iconColor } = config[type]

  return (
    <div className={`${bg} border rounded-lg p-4 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        {title && <h4 className={`font-semibold ${text} mb-1`}>{title}</h4>}
        <p className={text}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`${text} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
