export function hasReachedProfileEnd(attemptsWithoutNewPosts: number, maxAttemptsWithoutNewPosts: number): boolean {
  return attemptsWithoutNewPosts >= maxAttemptsWithoutNewPosts
}
