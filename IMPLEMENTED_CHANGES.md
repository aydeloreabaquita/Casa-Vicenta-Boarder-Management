# Casa Vicenta requested updates

Implemented in this version:

- **Rooms**
  - Manual **Add Room** button, positioned on the right side of the Rooms page.
  - **Edit Room** opens as an overlay modal with an **X** close button.
  - The Edit Room modal always shows a **Boarder** box, so a boarder can be added, removed, or changed directly while editing the room.
  - The room table headers use **Rent**, **Electricity**, and **Water** instead of “Rent Status”, “Electricity Status”, and “Water Status”.
  - The boarder selector now identifies boarders by phone number rather than email.

- **Boarders**
  - Added a **Boarders** tab directly below **Rooms** in the admin sidebar.
  - The Boarders table now contains exactly: **Boarder**, **Phone Number**, **Facebook**, **Occupation / School**, **Emergency Contact**, and **Actions**.
  - Actions are **Delete** and **Reset Password**.
  - Delete removes the boarder from active admin views, ends any active room assignment, blocks login access, and preserves historical billing/payment records.
  - Reset Password sets a new temporary password and requires the boarder to change it after login.

- **Applicants**
  - Applicant contact/profile details were moved into the Applicants table, including phone, Facebook, occupation/school, preferred move-in, preferred floor, occupants, and emergency contact.
  - Birth date, account state, and current address are no longer shown.
  - **Facebook** replaces **Email** in the applicant-facing profile information.
  - The public application form now asks for Facebook instead of email and no longer asks for birth date or current address.
  - The Actions column includes **Schedule Viewing**, **Decline**, and **Add as Boarder**.
  - **Add as Boarder** creates the login/profile from the applicant record and assigns a vacant room.

- **Users**
  - The **Add Boarder Profile Manually** form uses Facebook instead of email for boarder profile information.
  - Birth date and current address were removed from the manual boarder form.
  - Admins can create an unassigned boarder or immediately assign a vacant room.

- **Complaints**
  - The final column is named **Actions**.
  - A **Resolved** button marks an open complaint as resolved.

## Database update

Run all migrations before using this updated version:

```bash
npm run db:local
```

For production D1:

```bash
npm run db:remote
```

Migration `0005_facebook_profiles.sql` adds Facebook fields to applicant and boarder profiles. Migration `0004_boarder_admin_actions.sql` remains responsible for soft-deleting boarder accounts while preserving historical records.
