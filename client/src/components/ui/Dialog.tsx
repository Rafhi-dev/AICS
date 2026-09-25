import * as React from "react"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl bg-white p-4 sm:p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 my-auto overflow-y-auto">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 z-10 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </button>
        {children}
      </div>
    </div>
  )
}
