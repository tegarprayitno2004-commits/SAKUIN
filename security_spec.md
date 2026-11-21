# SAKUIN Security Specification & Payload-First Security TDD

## 1. Data Invariants
1. **User Isolation**: A user can only read, create, update, or delete their own `users/{userId}` document (`request.auth.uid == userId`). `allow list` is forbidden.
2. **Personal Scope Isolation**: Any `transactions`, `budgets`, `categories`, or `savingsGoals` document with `scope == 'personal'` MUST have `groupId == null` and `ownerId == request.auth.uid`. User A can never read, list, or mutate User B's personal documents.
3. **Group Scope Isolation & Membership Gate**: Any `transactions`, `budgets`, `categories`, or `savingsGoals` document with `scope == 'group'` MUST reference an existing `groups/{groupId}` where the caller has a `groupMembers/{groupId}_{uid}` record. Queries omitting `ownerId` or `groupId` are rejected by rules.
4. **Role & Permission Enforcement**:
   - Only the group owner (`role == 'owner'`) can rename a group, update `memberPermissions`, regenerate/deactivate `inviteCodes`, remove other members, delete the group, or write group `budgets`, `categories`, and `savingsGoals`.
   - Group members can only view all group transactions if `canViewAllTransactions == true` (otherwise only their own `createdBy == uid`), add transactions if `canAddTransactions == true`, and edit/delete their own transactions if `canEditOwnTransactions == true`.
5. **Immutable Ownership & Timestamps**: `ownerId`, `groupId`, `scope`, `createdBy`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
6. **Monetary Integrity**: Transaction and budget amounts must be positive integers (`amount is int && amount > 0 && amount <= 1000000000000`), preventing negative/float/overflow corruption.
7. **Invite Code Protection**: `inviteCodes/{code}` allows `get` only for authenticated users knowing the exact 8-character code; `list` is completely disabled (`allow list: if false`).
8. **Notification & Subscription Integrity**: `notifications` are scoped strictly to `userId == uid`, and updates are restricted to `isRead`. `premiumSubscriptions/{userId}` strictly enforces `simulated == true` and `priceIdr == 19000`.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Cross-User Personal Read**: User B queries `transactions` where `scope == 'personal' && ownerId == userA` -> `PERMISSION_DENIED`.
2. **Unfiltered Collection Scan**: User A queries `transactions` without `ownerId` or `groupId` filter -> `PERMISSION_DENIED`.
3. **Cross-Group Transaction Read**: Member of Group A queries `transactions` with `groupId == groupB` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: User A creates transaction with extra field `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` check fails).
5. **Negative / Float Amount**: User A creates transaction with `amount: -50000` or `amount: 12.5` -> `PERMISSION_DENIED`.
6. **Ownership Hijack on Update**: Member B updates Group A transaction changing `ownerId` or `createdBy` to `userB` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: User A creates transaction with client-forged `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Invite Code Enumeration**: User A runs `list` query on `inviteCodes` -> `PERMISSION_DENIED`.
9. **Unauthorized Member Self-Promotion**: User B creates `groupMembers/{groupA_userB}` with `role: 'owner'` -> `PERMISSION_DENIED`.
10. **Disabled Invite Code Join**: User B tries to join Group A using an `inviteCode` where `active == false` -> `PERMISSION_DENIED`.
11. **Member Overriding Group Budget**: Non-owner member attempts to create or update `budgets` with `scope: 'group'` -> `PERMISSION_DENIED`.
12. **Fake Non-Simulated Premium**: User A writes `premiumSubscriptions/{uid}` with `simulated: false` or `priceIdr: 0` -> `PERMISSION_DENIED`.
