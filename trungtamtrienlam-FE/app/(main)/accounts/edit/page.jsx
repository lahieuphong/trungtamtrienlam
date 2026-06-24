'use client'

import { useSearchParams } from 'next/navigation'
import AccountForm from '@/components/AccountForm'

export default function AccountEditPage() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    return <AccountForm mode="edit" id={id} />
}
