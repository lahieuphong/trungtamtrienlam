import { useEffect, useState } from 'react'

export function normalizeSearchText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u0111\u0110]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}

function compactSearchText(value) {
    return normalizeSearchText(value).replace(/\s+/g, '')
}

function hasLetter(value) {
    return /[a-z]/.test(value)
}

function isSubsequence(needle, haystack) {
    if (!needle) return true
    if (!haystack || needle.length > haystack.length) return false

    let index = 0
    for (let i = 0; i < haystack.length && index < needle.length; i += 1) {
        if (haystack[i] === needle[index]) index += 1
    }
    return index === needle.length
}

function levenshteinWithin(a, b, maxDistance) {
    if (a === b) return true
    if (Math.abs(a.length - b.length) > maxDistance) return false
    if (maxDistance <= 0) return false

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i += 1) {
        const current = [i]
        let rowMin = current[0]
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            const value = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + cost
            )
            current[j] = value
            rowMin = Math.min(rowMin, value)
        }
        if (rowMin > maxDistance) return false
        previous = current
    }
    return previous[b.length] <= maxDistance
}

function hasAdjacentTransposition(a, b) {
    if (a.length !== b.length) return false

    const mismatches = []
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) mismatches.push(i)
        if (mismatches.length > 2) return false
    }

    return mismatches.length === 2
        && mismatches[1] === mismatches[0] + 1
        && a[mismatches[0]] === b[mismatches[1]]
        && a[mismatches[1]] === b[mismatches[0]]
}

function allowedDistance(token) {
    if (token.length <= 2) return 0
    if (token.length <= 5) return 1
    return 2
}

function canUseFuzzyToken(token, candidateToken) {
    if (token.length <= 3) {
        return candidateToken.length >= 3 && token[0] === candidateToken[0]
    }
    return true
}

function isFuzzyTokenMatch(token, candidateToken, maxDistance) {
    if (!canUseFuzzyToken(token, candidateToken)) return false
    return levenshteinWithin(token, candidateToken, maxDistance)
        || (maxDistance > 0 && hasAdjacentTransposition(token, candidateToken))
}

function tokenScore(token, candidateTokens, candidateCompact) {
    if (!token) return 0
    if (candidateCompact.includes(token)) return 1
    if (hasLetter(token) && token.length >= 4 && isSubsequence(token, candidateCompact)) return 3

    let best = Number.POSITIVE_INFINITY
    const maxDistance = allowedDistance(token)
    for (const candidateToken of candidateTokens) {
        if (!candidateToken) continue
        if (candidateToken === token) best = Math.min(best, 0)
        else if (candidateToken.startsWith(token)) best = Math.min(best, 1)
        else if (candidateToken.includes(token)) best = Math.min(best, 2)
        else if (maxDistance > 0 && isFuzzyTokenMatch(token, candidateToken, maxDistance)) best = Math.min(best, 4 + maxDistance)
    }
    return best
}

export function scoreSearchMatch(candidate, query) {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return 0

    const normalizedCandidate = normalizeSearchText(candidate)
    if (!normalizedCandidate) return Number.POSITIVE_INFINITY

    const queryCompact = normalizedQuery.replace(/\s+/g, '')
    const candidateCompact = compactSearchText(normalizedCandidate)
    if (normalizedCandidate === normalizedQuery || candidateCompact === queryCompact) return 0
    if (normalizedCandidate.startsWith(normalizedQuery)) return 1
    if (candidateCompact.includes(queryCompact)) return 2
    if (hasLetter(queryCompact) && queryCompact.length >= 3 && queryCompact.length <= 5 && isSubsequence(queryCompact, candidateCompact)) return 6

    const candidateTokens = normalizedCandidate.split(' ')
    const queryTokens = normalizedQuery.split(' ')
    let score = 10
    for (const token of queryTokens) {
        const nextScore = tokenScore(token, candidateTokens, candidateCompact)
        if (!Number.isFinite(nextScore)) return Number.POSITIVE_INFINITY
        score += nextScore
    }
    return score
}

export function matchesSearchQuery(candidate, query) {
    return Number.isFinite(scoreSearchMatch(candidate, query))
}

export function sortBySearchScore(items, query, getText = (item) => item) {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return items

    return items
        .map((item, index) => ({
            item,
            index,
            score: scoreSearchMatch(getText(item), normalizedQuery),
        }))
        .filter(({ score }) => Number.isFinite(score))
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .map(({ item }) => item)
}

export function useDebouncedValue(value, delay = 250) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedValue(value), delay)
        return () => window.clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}