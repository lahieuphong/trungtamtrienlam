'use client'

import { useParams } from 'next/navigation'

import MonumentCreateEntry from '@/components/monuments/MonumentCreateEntry'

export default function WebsiteMonumentProfileCreatePage() {
    const params = useParams()
    return <MonumentCreateEntry alias={params?.alias || 'public'} />
}