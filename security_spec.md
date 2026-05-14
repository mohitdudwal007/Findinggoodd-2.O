# Security Specification: Findinggoodd

## 1. Data Invariants
- A `movie` can only be created, updated, or deleted by an Administrator.
- An Administrator is identified by the email `mohitdudwal007@gmail.com`.
- Anyone can read the list of movies.
- A `movie` must contain `title`, `director`, `year`, `rating`, `poster`, `genre`, `size`, `downloadLink`, `createdAt`, and `updatedAt`.
- All `movie` fields must be of correct types and bounded sizes.

## 2. The "Dirty Dozen" Payloads
1. Create movie with missing `title`.
2. Create movie with extra ghost field `isVerified: true`.
3. Create movie with `title` exceeding size limits.
4. Update movie with invalid data type for `rating` (string instead of number).
5. Update movie `createdAt` timestamp (should be immutable).
6. Non-admin attempting to create a movie.
7. Non-admin attempting to update a movie.
8. Non-admin attempting to delete a movie.
9. Admin attempting to create movie with client-provided `createdAt` instead of `request.time`.
10. Admin attempting to update movie with mismatched `updatedAt`.
11. Query movies attempting to bypass `limit` or malicious `where`? (List rule specifies anyone can read, so mostly testing write payloads).
12. Creating movie with ID longer than 128 chars.

## 3. The Test Runner
(To be implemented in `firestore.rules.test.ts`)
