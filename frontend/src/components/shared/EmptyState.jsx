import { Inbox } from 'lucide-react'

export default function EmptyState({ message, Icon: IconProp }) {
  const Icon = IconProp || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon
        size={48}
        strokeWidth={1}
        className="text-[#9ca3af]"
        aria-hidden
      />
      <p className="mt-3 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
        {message}
      </p>
    </div>
  )
}
