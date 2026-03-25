'use client'
import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

type HelpStep = {
  title: string
  description: string
}

type FeatureHelpProps = {
  title: string
  description: string
  steps: HelpStep[]
  videoUrl?: string
}

export function FeatureHelp({ title, description, steps }: FeatureHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Comment utiliser : {title}</p>
            <p className="text-slate-400 text-xs">{description}</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-blue-500/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#1e293b] rounded-xl">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-xs">{i + 1}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
