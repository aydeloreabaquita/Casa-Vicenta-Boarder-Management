# Casa Vicenta room inventory and administrator rollout

## Room inventory
The migration `migrations/0099_casa_vicenta_30_rooms.sql` prepares:
- First floor: rooms 101–112 (12 rooms)
- Second floor: rooms 201–218 (18 rooms)
- Total: 30 rooms

It adds missing rooms only and **does not overwrite existing occupants, room rates, or statuses**. New records default to the ₱4,500 non-AC rate. In the Admin Rooms screen, set each AC room's rate to ₱5,500 after confirming which units have AC. Don't label all rooms physically available until verified.

Apply migrations using the appropriate configured Cloudflare D1 database:
```bash
npm run db:remote
```
**Important:** The tracked `wrangler.jsonc` contains a placeholder D1 database ID. Set the correct production D1 binding in your secure deployment configuration before running any migration.

## Administrator accounts
The application already has an admin-create workflow at `POST /api/admin/users` and an admin bootstrap endpoint. The requested administrator emails are:
- aabaquita22@gmail.com (existing account: preserve its current password)
- mommy1655@att.net (new administrator)

To create the second admin, sign in as the existing administrator and use the Users screen if available. Its initial password is taken from the server-side `BOOTSTRAP_ADMIN_PASSWORD` environment secret and the system requires a password change on first login. Do **not** place passwords in GitHub, client-side JavaScript, migrations, or readme files.

If a specific initial password is required, configure it in a secure backend provisioning workflow, use it once, then rotate it. The current admin creation API **does not accept an individual initial password**, so it will not set a user-supplied per-account password without a secure server-side change.

## Verification
1. Check Admin > Rooms shows 12 on floor 1 and 18 on floor 2.
2. Confirm existing room occupancy and room rates were not overwritten.
3. Set AC rooms to ₱5,500, and non-AC rooms to ₱4,500.
4. Verify the original admin can sign in normally.
5. Provision the second admin through the authenticated backend and require a password change.
6. Deploy the Worker build separately from applying the D1 migration.
