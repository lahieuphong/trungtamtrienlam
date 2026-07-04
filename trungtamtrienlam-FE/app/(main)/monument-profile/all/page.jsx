import MonumentProfileList from '@/components/monuments/MonumentProfileList'

export default async function MonumentAllPage({ searchParams }) {
    const params = await searchParams
    return <MonumentProfileList mode="all" initialTab={params?.tab} />
}