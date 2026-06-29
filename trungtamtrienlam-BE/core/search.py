import re
import unicodedata


def normalize_search_text(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    text = text.replace('\u0111', 'd').replace('\u0110', 'd').lower()
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def compact_search_text(value):
    return normalize_search_text(value).replace(' ', '')


def has_letter(value):
    return re.search(r'[a-z]', value) is not None


def is_subsequence(needle, haystack):
    if not needle:
        return True
    if not haystack or len(needle) > len(haystack):
        return False

    index = 0
    for char in haystack:
        if index < len(needle) and char == needle[index]:
            index += 1
    return index == len(needle)


def levenshtein_within(a, b, max_distance):
    if a == b:
        return True
    if abs(len(a) - len(b)) > max_distance:
        return False
    if max_distance <= 0:
        return False

    previous = list(range(len(b) + 1))
    for i, char_a in enumerate(a, 1):
        current = [i]
        row_min = i
        for j, char_b in enumerate(b, 1):
            cost = 0 if char_a == char_b else 1
            value = min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
            current.append(value)
            row_min = min(row_min, value)
        if row_min > max_distance:
            return False
        previous = current
    return previous[-1] <= max_distance


def has_adjacent_transposition(a, b):
    if len(a) != len(b):
        return False

    mismatches = []
    for index, char in enumerate(a):
        if char != b[index]:
            mismatches.append(index)
        if len(mismatches) > 2:
            return False

    return (
        len(mismatches) == 2
        and mismatches[1] == mismatches[0] + 1
        and a[mismatches[0]] == b[mismatches[1]]
        and a[mismatches[1]] == b[mismatches[0]]
    )


def allowed_distance(token):
    if len(token) <= 2:
        return 0
    if len(token) <= 5:
        return 1
    return 2


def can_use_fuzzy_token(token, candidate_token):
    if len(token) <= 3:
        return len(candidate_token) >= 3 and token[0] == candidate_token[0]
    return True


def is_fuzzy_token_match(token, candidate_token, max_distance):
    if not can_use_fuzzy_token(token, candidate_token):
        return False
    return levenshtein_within(token, candidate_token, max_distance) or (
        max_distance > 0 and has_adjacent_transposition(token, candidate_token)
    )


def token_score(token, candidate_tokens, candidate_compact):
    if not token:
        return 0
    if token in candidate_compact:
        return 1
    if has_letter(token) and len(token) >= 4 and is_subsequence(token, candidate_compact):
        return 3

    best = None
    max_distance = allowed_distance(token)
    for candidate_token in candidate_tokens:
        if not candidate_token:
            continue
        if candidate_token == token:
            score = 0
        elif candidate_token.startswith(token):
            score = 1
        elif token in candidate_token:
            score = 2
        elif max_distance > 0 and is_fuzzy_token_match(token, candidate_token, max_distance):
            score = 4 + max_distance
        else:
            continue
        best = score if best is None else min(best, score)
    return best


def search_score(candidate, query):
    normalized_query = normalize_search_text(query)
    if not normalized_query:
        return 0

    normalized_candidate = normalize_search_text(candidate)
    if not normalized_candidate:
        return None

    query_compact = normalized_query.replace(' ', '')
    candidate_compact = compact_search_text(normalized_candidate)
    if normalized_candidate == normalized_query or candidate_compact == query_compact:
        return 0
    if normalized_candidate.startswith(normalized_query):
        return 1
    if query_compact in candidate_compact:
        return 2
    if has_letter(query_compact) and 3 <= len(query_compact) <= 5 and is_subsequence(query_compact, candidate_compact):
        return 6

    score = 10
    candidate_tokens = normalized_candidate.split(' ')
    for token in normalized_query.split(' '):
        next_score = token_score(token, candidate_tokens, candidate_compact)
        if next_score is None:
            return None
        score += next_score
    return score


def matches_search(candidate, query):
    return search_score(candidate, query) is not None