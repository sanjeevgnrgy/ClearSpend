# Clearspend Firestore Security Specification

## 1. Data Invariants
1. User personal records (`/users/{userId}/transactions`, `/rules`, `/subscriptions`, `/receipts`) belong exclusively to `userId` (`request.auth.uid == userId && incoming().ownerId == userId`).
2. PII (`email`, `monthlyBudgetCap`, `checkingBuffer`) is isolated under `/users/{userId}/private/{docId}` and readable only by the owner.
3. Shared Splitwise groups (`/groups/{groupId}`) require `ownerId == request.auth.uid` on creation, `request.auth.uid in memberUids`, and bounded `memberUids.size() <= 15`.
4. Subcollections under `/groups/{groupId}` (`/members`, `/expenses`) enforce the Master Gate (`get(/databases/$(database)/documents/groups/$(groupId))`) verifying the caller is in `memberUids` or is `ownerId`.
5. Every `create` and `update` enforces `request.auth.token.email_verified == true`, `isValidId()` on target document IDs, strict `keys().hasAll(...) && keys().hasOnly(...)`, string `.size()` bounds, and server timestamp checks (`request.time`).
6. `/publicShares/{shareId}` allows single-document `get` (for no-login settlement link sharing) while strictly disabling `list` (`allow list: if false;`) and restricting writes to the owning group creator (`ownerId == request.auth.uid`).

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/users/uid1/transactions/tx1`.
2. Authenticated user `uid2` reading `/users/uid1/private/profile` (PII leak test).
3. Authenticated user `uid1` creating a transaction with `ownerId: "uid2"` (Identity spoofing).
4. Authenticated user `uid1` adding a shadow field `isVerified: true` on `/users/uid1/transactions/tx1` (Shadow update test).
5. Unverified email token (`email_verified: false`) writing to `/groups/g1`.
6. Client-forged `createdAt` timestamp in the past on `/users/uid1/transactions/tx1`.
7. Oversized `merchant` string (> 120 chars) or oversized document ID (> 128 chars) (Resource poisoning).
8. User `uid2` (not in `memberUids`) reading or listing `/groups/g1/expenses`.
9. Group member modifying `ownerId` or `createdAt` during an update to `/groups/g1`.
10. Unbounded `memberUids` array (> 15 elements) on `/groups/g1`.
11. Unauthenticated `list` query on `/publicShares` attempting to scrape all shared trip links.
12. User `uid2` overwriting `/publicShares/share1` owned by `uid1`.
