const encoder = new TextEncoder();
const SESSION_COOKIE = "cv_session";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 100000;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });

    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        validateRequestOrigin(request);
      }

      if (request.method === "OPTIONS") return new Response(null, { status: 204 });

      // Public / setup / auth routes.
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ ok: true, service: "Casa Vicenta API" });
      }
      if (url.pathname === "/api/setup/bootstrap" && request.method === "POST") {
        return await bootstrapAdmins(request, env);
      }
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return await login(request, env);
      }
      if (url.pathname === "/api/auth/forgot-password" && request.method === "POST") {
        return await requestPasswordReset(request, env);
      }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return await logout(request, env);
      }
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await getSessionUser(request, env);
        return json({ user: user ? publicUser(user) : null });
      }
      if (url.pathname === "/api/auth/change-password" && request.method === "POST") {
        const user = await requireUser(request, env);
        return await changePassword(request, env, user);
      }
      if (url.pathname === "/api/public/rooms" && request.method === "GET") {
        return await listPublicRooms(env);
      }
      if (url.pathname === "/api/public/contact" && request.method === "GET") {
        const settings = await getSettings(env.DB);
        return json({
          landladyName: settings.landlady_name || "",
          landladyEmail: settings.landlady_email || "",
          landladyPhone: settings.landlady_phone || ""
        });
      }
      if (url.pathname === "/api/applications" && request.method === "POST") {
        return await submitApplication(request, env);
      }
      if (url.pathname === "/api/public/applicant-requests" && request.method === "POST") {
        return await submitApplicantRequest(request, env);
      }

      const user = await requireUser(request, env);

      // Boarder routes.
      if (url.pathname === "/api/boarder/dashboard" && request.method === "GET") {
        requireRole(user, "boarder");
        return await boarderDashboard(env, user);
      }
      if (url.pathname === "/api/boarder/payments" && request.method === "POST") {
        requireRole(user, "boarder");
        return await submitPaymentReceipt(request, env, user);
      }
      if (url.pathname === "/api/boarder/payment-promise" && request.method === "POST") {
        requireRole(user, "boarder");
        return await submitBoarderPaymentPromise(request, env, user);
      }
      if (url.pathname === "/api/boarder/complaints" && request.method === "POST") {
        requireRole(user, "boarder");
        return await createComplaint(request, env, user);
      }
      if (url.pathname === "/api/boarder/contract" && request.method === "GET") {
        requireRole(user, "boarder");
        return await boarderContract(env, user);
      }

      // Admin routes.
      requireRole(user, "admin");

      if (url.pathname === "/api/admin/dashboard" && request.method === "GET") {
        return await adminDashboard(env);
      }
      if (url.pathname === "/api/admin/rooms" && request.method === "GET") {
        return await adminRooms(env);
      }
      if (url.pathname === "/api/admin/rooms" && request.method === "POST") {
        return await createRoom(request, env, user);
      }
      if (url.pathname === "/api/admin/room-history" && request.method === "GET") {
        return await roomHistory(env);
      }
      if (url.pathname === "/api/admin/water" && request.method === "PUT") {
        return await updateWater(request, env, user);
      }
      if (url.pathname === "/api/admin/boarders" && request.method === "GET") return await adminBoarders(env);
      const profileMatch = url.pathname.match(/^\/api\/admin\/boarders\/(\d+)$/);
      if (profileMatch && request.method === "GET") return await boarderProfile(env, Number(profileMatch[1]));
      if (profileMatch && request.method === "PATCH") return await updateBoarderProfile(request, env, user, Number(profileMatch[1]));
      if (profileMatch && request.method === "DELETE") return await deleteBoarder(env, user, Number(profileMatch[1]));
      if (url.pathname === "/api/admin/payment-promises" && request.method === "POST") return await createPaymentPromise(request, env, user);
      const roomMatch = url.pathname.match(/^\/api\/admin\/rooms\/(\d+)$/);
      if (roomMatch && request.method === "PATCH") {
        return await updateRoom(request, env, user, Number(roomMatch[1]));
      }

      if (url.pathname === "/api/admin/payments" && request.method === "GET") {
        return await adminPayments(env);
      }
      const receiptMatch = url.pathname.match(/^\/api\/admin\/payments\/(\d+)\/receipt$/);
      if (receiptMatch && request.method === "GET") {
        return await getReceipt(env, Number(receiptMatch[1]));
      }
      const approveMatch = url.pathname.match(/^\/api\/admin\/payments\/(\d+)\/approve$/);
      if (approveMatch && request.method === "POST") {
        return await approvePayment(request, env, user, Number(approveMatch[1]));
      }
      const rejectMatch = url.pathname.match(/^\/api\/admin\/payments\/(\d+)\/reject$/);
      if (rejectMatch && request.method === "POST") {
        return await rejectPayment(request, env, user, Number(rejectMatch[1]));
      }

      if (url.pathname === "/api/admin/applicants" && request.method === "GET") {
        return await adminApplicants(env);
      }
      const scheduleMatch = url.pathname.match(/^\/api\/admin\/applicants\/(\d+)\/schedule$/);
      if (scheduleMatch && request.method === "POST") {
        return await scheduleApplicant(request, env, user, Number(scheduleMatch[1]));
      }
      const declineApplicantMatch = url.pathname.match(/^\/api\/admin\/applicants\/(\d+)\/decline$/);
      if (declineApplicantMatch && request.method === "POST") {
        return await declineApplicant(env, user, Number(declineApplicantMatch[1]));
      }
      const addApplicantMatch = url.pathname.match(/^\/api\/admin\/applicants\/(\d+)\/add-as-boarder$/);
      if (addApplicantMatch && request.method === "POST") {
        return await addApplicantAsBoarder(request, env, user, Number(addApplicantMatch[1]));
      }
      const acceptApplicantRequestMatch = url.pathname.match(/^\/api\/admin\/applicant-requests\/(\d+)\/accept-reschedule$/);
      if (acceptApplicantRequestMatch && request.method === "POST") {
        return await acceptApplicantRescheduleRequest(env, user, Number(acceptApplicantRequestMatch[1]));
      }
      const applicantRequestMatch = url.pathname.match(/^\/api\/admin\/applicant-requests\/(\d+)$/);
      if (applicantRequestMatch && request.method === "PATCH") {
        return await updateApplicantRequest(request, env, user, Number(applicantRequestMatch[1]));
      }

      if (url.pathname === "/api/admin/complaints" && request.method === "GET") {
        return await adminComplaints(env);
      }
      const complaintResetMatch = url.pathname.match(/^\/api\/admin\/complaints\/(\d+)\/reset-password$/);
      if (complaintResetMatch && request.method === "POST") {
        return await resetPasswordRequestComplaint(env, user, Number(complaintResetMatch[1]));
      }
      const complaintMatch = url.pathname.match(/^\/api\/admin\/complaints\/(\d+)$/);
      if (complaintMatch && request.method === "PATCH") {
        return await updateComplaint(request, env, user, Number(complaintMatch[1]));
      }

      if (url.pathname === "/api/admin/users" && request.method === "GET") {
        return await adminUsers(env);
      }
      if (url.pathname === "/api/admin/users" && request.method === "POST") {
        return await createAdmin(request, env, user);
      }
      const resetMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (resetMatch && request.method === "POST") {
        return await resetPassword(request, env, user, Number(resetMatch[1]));
      }
      if (url.pathname === "/api/admin/boarders" && request.method === "POST") {
        return await createBoarder(request, env, user);
      }
      const endOccupancyMatch = url.pathname.match(/^\/api\/admin\/occupancies\/(\d+)\/end$/);
      if (endOccupancyMatch && request.method === "POST") {
        return await endOccupancy(env, user, Number(endOccupancyMatch[1]));
      }

      if (url.pathname === "/api/admin/electricity" && request.method === "POST") {
        return await saveElectricity(request, env, user);
      }

      if (url.pathname === "/api/admin/settings" && request.method === "GET") {
        return json({ settings: await getSettings(env.DB) });
      }
      if (url.pathname === "/api/admin/settings" && request.method === "PUT") {
        return await updateSettings(request, env, user);
      }

      return json({ error: "API route not found" }, 404);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      return json({ error: "Unexpected server error" }, 500);
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanupQueuedReceipts(env));
    ctx.waitUntil(sendDueDateSmsReminders(env));
    ctx.waitUntil(sendPaymentPromiseSmsReminders(env));
    ctx.waitUntil(sendViewingScheduleSmsReminders(env));
  }
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function validateRequestOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  const local = ["localhost", "127.0.0.1"].includes(originUrl.hostname) && ["localhost", "127.0.0.1"].includes(requestUrl.hostname);
  if (!local && originUrl.origin !== requestUrl.origin) throw new HttpError(403, "Cross-origin request blocked");
}

async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new HttpError(415, "Expected JSON request body");
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

function cleanText(value, max = 500) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function requireText(value, name, max = 500) {
  const text = cleanText(value, max);
  if (!text) throw new HttpError(400, `${name} is required`);
  return text;
}

function normalizeEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "A valid email is required");
  return email;
}


function temporaryPassword(env) {
  const password = cleanText(env.BOOTSTRAP_ADMIN_PASSWORD, 200);
  if (!password) throw new HttpError(500, "BOOTSTRAP_ADMIN_PASSWORD is not configured");
  validateNewPassword(password);
  return password;
}

function bootstrapAdminAccounts(env) {
  const raw = cleanText(env.BOOTSTRAP_ADMIN_EMAILS, 1200);
  const emails = raw.split(/[\s,;]+/).map(v => v.trim()).filter(Boolean);
  if (!emails.length) throw new HttpError(500, "BOOTSTRAP_ADMIN_EMAILS is not configured");
  return emails.slice(0, 10).map((email, index) => [index === 0 ? "Primary Admin" : `Admin ${index + 1}`, normalizeEmail(email)]);
}
function normalizePhone(value) {
  const phone = cleanText(value, 30).replace(/[\s()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(phone)) throw new HttpError(400, "A valid phone number is required");
  return phone;
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
    status: user.status
  };
}

async function bootstrapAdmins(request, env) {
  const supplied = request.headers.get("x-setup-secret") || "";
  if (!env.SETUP_SECRET || !safeEqual(supplied, env.SETUP_SECRET)) throw new HttpError(403, "Invalid setup secret");

  const admins = bootstrapAdminAccounts(env);
  const tempPassword = temporaryPassword(env);
  const results = [];
  for (const [name, email] of admins) {
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").bind(email).first();
    if (existing) {
      results.push({ email, created: false });
      continue;
    }
    const passwordHash = await hashPassword(tempPassword);
    const result = await env.DB.prepare(
      "INSERT INTO users (full_name,email,password_hash,role,must_change_password,status) VALUES (?,?,?,?,1,'active')"
    ).bind(name, email, passwordHash, "admin").run();
    results.push({ email, created: true, id: result.meta?.last_row_id });
  }
  return json({ ok: true, admins: results, message: "Admin bootstrap complete. Sign in with the configured temporary password and change it immediately." });
}

async function login(request, env) {
  const body = await readJson(request);
  const identifier = requireText(body.identifier, "Email or phone", 254);
  const password = requireText(body.password, "Password", 200);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE status='active' AND (email = ? COLLATE NOCASE OR phone = ?) LIMIT 1"
  ).bind(identifier.toLowerCase(), identifier.replace(/[\s()-]/g, "")).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) throw new HttpError(401, "Invalid login credentials");

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)")
    .bind(user.id, tokenHash, expires).run();

  return json({ user: publicUser(user) }, 200, { "set-cookie": sessionCookie(token, SESSION_DAYS * 86400, request) });
}

async function requestPasswordReset(request, env) {
  const body = await readJson(request);
  const identifier = requireText(body.identifier, "Email or phone", 254);
  const phoneCandidates = phoneLookupCandidates(identifier);

  const user = await env.DB.prepare(`
    SELECT id,full_name,phone,email
    FROM users
    WHERE role='boarder'
      AND status='active'
      AND deleted_at IS NULL
      AND (
        email=? COLLATE NOCASE
        OR phone IN (?,?,?)
      )
    LIMIT 1
  `).bind(
    identifier.toLowerCase(),
    phoneCandidates[0] || "",
    phoneCandidates[1] || "",
    phoneCandidates[2] || ""
  ).first();

  if (user) {
    const existing = await env.DB.prepare(`
      SELECT id
      FROM complaints
      WHERE boarder_id=?
        AND request_type='password_reset'
        AND status IN ('submitted','seen','in_progress')
      ORDER BY id DESC
      LIMIT 1
    `).bind(user.id).first();

    if (!existing) {
      const occupancy = await env.DB.prepare(
        "SELECT room_id FROM occupancies WHERE user_id=? AND status='active' LIMIT 1"
      ).bind(user.id).first();

      await env.DB.prepare(`
        INSERT INTO complaints
        (boarder_id,room_id,category,subject,description,request_type,status)
        VALUES (?,?,?,?,?,'password_reset','submitted')
      `).bind(
        user.id,
        occupancy?.room_id || null,
        "Account",
        "Request to Reset Password",
        "Request to reset password"
      ).run();
    }
  }

  return json({
    ok: true,
    message: "If the information matches an active boarder account, the password reset request has been sent to the admin."
  });
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
}

async function getSessionUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  return env.DB.prepare(`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.status='active'
    LIMIT 1
  `).bind(tokenHash).first();
}

async function requireUser(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) throw new HttpError(401, "Please log in");
  return user;
}

function requireRole(user, role) {
  if (user.role !== role) throw new HttpError(403, "You do not have access to this area");
}

async function changePassword(request, env, user) {
  const body = await readJson(request);
  const currentPassword = requireText(body.currentPassword, "Current password", 200);
  const newPassword = requireText(body.newPassword, "New password", 200);
  validateNewPassword(newPassword);
  if (!(await verifyPassword(currentPassword, user.password_hash))) throw new HttpError(400, "Current password is incorrect");
  if (currentPassword === newPassword) throw new HttpError(400, "New password must be different");
  const hash = await hashPassword(newPassword);
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash=?, must_change_password=0, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(hash, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
    env.DB.prepare("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (?,?,?)").bind(user.id, tokenHash, expires)
  ]);
  const updatedUser = { ...user, must_change_password: 0 };
  return json({ ok: true, message: "Password changed.", user: publicUser(updatedUser) }, 200, { "set-cookie": sessionCookie(token, SESSION_DAYS * 86400, request) });
}

function validateNewPassword(password) {
  if (password.length < 10) throw new HttpError(400, "Use at least 10 characters for the new password");
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new HttpError(400, "Password must contain letters and numbers");
}

async function listPublicRooms(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, room_number AS roomNumber, floor, monthly_rate AS monthlyRate FROM rooms WHERE status='vacant' ORDER BY floor, room_number"
  ).all();
  return json({ rooms: results || [] });
}

async function submitApplication(request, env) {
  const body = await readJson(request);
  const fullName = requireText(body.fullName, "Full name", 120);
  const facebook = requireText(body.facebook, "Facebook", 300);
  const phone = normalizePhone(body.phone);
  const floor = ["First Floor", "Second Floor", "No Preference"].includes(body.preferredFloor) ? body.preferredFloor : "No Preference";
  const occupants = Math.max(1, Math.min(20, Number(body.occupants) || 1));

  const result = await env.DB.prepare(`
    INSERT INTO applicants
    (full_name,email,phone,facebook,occupation_school,preferred_move_in,preferred_floor,occupants,emergency_contact,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(
    fullName, "", phone, facebook, cleanText(body.occupationSchool, 150), cleanText(body.preferredMoveIn, 20),
    floor, occupants, cleanText(body.emergencyContact, 150), cleanText(body.notes, 1000)
  ).run();
  return json({ ok: true, applicantId: result.meta?.last_row_id, message: "Application submitted for admin review." }, 201);
}


async function submitApplicantRequest(request, env) {
  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  const requestType = cleanText(body.requestType, 30);
  const message = requireText(body.message, "Message", 1000);

  if (!["reschedule", "question", "cancel"].includes(requestType)) {
    throw new HttpError(400, "Choose Reschedule Viewing, Ask a Question, or Cancel Viewing");
  }

  const applicant = await env.DB.prepare(`
    SELECT id,full_name AS fullName,status
    FROM applicants
    WHERE phone=?
    ORDER BY id DESC
    LIMIT 1
  `).bind(phone).first();

  if (!applicant) {
    throw new HttpError(404, "We could not find an application using that phone number");
  }

  if (applicant.status === "accepted") {
    throw new HttpError(409, "This application is already a boarder account. Please log in to contact Casa Vicenta.");
  }

  if (applicant.status === "declined" && requestType !== "question") {
    throw new HttpError(409, "This application is already closed. You may still send a question to Casa Vicenta.");
  }

  let requestedViewingAt = null;
  if (requestType === "reschedule") {
    requestedViewingAt = requireText(body.requestedViewingAt, "Preferred new viewing date and time", 40);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(requestedViewingAt)) {
      throw new HttpError(400, "Choose a valid preferred viewing date and time");
    }
  }

  const currentViewing = await env.DB.prepare(`
    SELECT scheduled_at AS scheduledAt
    FROM viewing_schedules
    WHERE applicant_id=?
      AND cancelled_at IS NULL
    ORDER BY id DESC
    LIMIT 1
  `).bind(applicant.id).first();

  const result = await env.DB.prepare(`
    INSERT INTO applicant_requests
      (applicant_id,request_type,current_viewing_at,requested_viewing_at,message,status)
    VALUES (?,?,?,?,?,'new')
  `).bind(
    applicant.id,
    requestType,
    currentViewing?.scheduledAt || null,
    requestedViewingAt,
    message
  ).run();

  return json({
    ok: true,
    requestId: result.meta?.last_row_id,
    message: "Your request was sent to Casa Vicenta. The admin can review it under Applicant Requests."
  }, 201);
}

async function boarderDashboard(env, user) {
  const occupancy = await env.DB.prepare(`
    SELECT o.id AS occupancy_id,o.due_day,r.id AS room_id,r.room_number,r.floor,r.monthly_rate
    FROM occupancies o JOIN rooms r ON r.id=o.room_id
    WHERE o.user_id=? AND o.status='active' LIMIT 1
  `).bind(user.id).first();
  if (!occupancy) throw new HttpError(404, "No active room is assigned to this account");

  const settings = await getSettings(env.DB);

  const { results: bills } = await env.DB.prepare(`
    SELECT b.id,b.billing_period AS period,b.due_date AS dueDate,b.electricity_due_date AS storedElectricityDueDate,b.water_due_date AS storedWaterDueDate,b.room_rent AS roomRent,
      b.electricity_amount AS electricityAmount,b.electricity_consumption AS electricityConsumption,
      b.electricity_rate AS electricityRate,b.water_amount AS waterAmount,b.total_amount AS totalAmount,b.status,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
    FROM billing_cycles b WHERE b.boarder_id=? AND b.status!='void' ORDER BY b.billing_period DESC
  `).bind(user.id).all();
  const normalizedBills = (bills || []).map(b => {
    const settled = b.status === "paid";
    const rentDue = settled ? 0 : round2(Math.max(0,Number(b.roomRent)-Number(b.rentPaid)));
    const electricityDue = settled ? 0 : round2(Math.max(0,Number(b.electricityAmount)-Number(b.electricityPaid)));
    const waterDue = settled ? 0 : round2(Math.max(0,Number(b.waterAmount)-Number(b.waterPaid)));
    return {...b,
      rentDue,electricityDue,waterDue,
      rentDueDate: b.dueDate,
      electricityDueDate: b.storedElectricityDueDate || billingDueDate(b.period, settings.electricity_due_day),
      waterDueDate: b.storedWaterDueDate || billingDueDate(b.period, settings.water_due_day),
      pendingAmount: settled ? 0 : round2(Number(b.rentPending || 0)+Number(b.electricityPending || 0)+Number(b.waterPending || 0)),
      balance: round2(rentDue+electricityDue+waterDue)
    };
  });
  let carriedBalance = 0;
  for (const item of normalizedBills.slice().reverse()) {
    item.carryover = round2(carriedBalance);
    item.amountDue = round2(item.balance + item.carryover);
    carriedBalance = round2(carriedBalance + item.balance);
  }
  const bill = normalizedBills[0];
  const unpaidDueDates = normalizedBills.flatMap(item => [
    Math.max(0, Number(item.rentDue || 0) - Number(item.rentPending || 0)) > 0.001 ? item.rentDueDate : null,
    Math.max(0, Number(item.electricityDue || 0) - Number(item.electricityPending || 0)) > 0.001 ? item.electricityDueDate : null,
    Math.max(0, Number(item.waterDue || 0) - Number(item.waterPending || 0)) > 0.001 ? item.waterDueDate : null
  ].filter(Boolean));
  const oldestUnpaidDueDate = unpaidDueDates.sort()[0] || null;
  const today = manilaDate(new Date());
  const overdueCharges = normalizedBills.flatMap(item => [
    { amount:Math.max(0, Number(item.rentDue || 0)-Number(item.rentPending || 0)), dueDate:item.rentDueDate, billingId:item.id, type:"rent" },
    { amount:Math.max(0, Number(item.electricityDue || 0)-Number(item.electricityPending || 0)), dueDate:item.electricityDueDate, billingId:item.id, type:"electricity" },
    { amount:Math.max(0, Number(item.waterDue || 0)-Number(item.waterPending || 0)), dueDate:item.waterDueDate, billingId:item.id, type:"water" }
  ]).filter(charge => Number(charge.amount || 0) > 0.001 && charge.dueDate && charge.dueDate < today);
  const overdueAmount = round2(overdueCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0));
  const overdueSince = overdueCharges.map(charge => charge.dueDate).sort()[0] || null;
  const { results: payments } = await env.DB.prepare(`
    SELECT billing_period AS period,payment_type AS paymentType,amount,payment_date AS paymentDate,verified_at AS verifiedAt
    FROM payments WHERE boarder_id=? ORDER BY verified_at DESC LIMIT 48
  `).bind(user.id).all();
  const { results: promises } = await env.DB.prepare(`
    SELECT note,promised_date AS promisedDate,created_by AS createdBy,created_at AS createdAt FROM payment_promises
    WHERE boarder_id=? ORDER BY created_at DESC,id DESC LIMIT 20
  `).bind(user.id).all();
  const { results: complaints } = await env.DB.prepare(`
    SELECT id,category,subject,description,status,created_at AS createdAt FROM complaints
    WHERE boarder_id=? ORDER BY created_at DESC LIMIT 20
  `).bind(user.id).all();
  const profile = await env.DB.prepare(`
    SELECT deposit_amount AS depositBalance FROM boarder_profiles WHERE user_id=? LIMIT 1
  `).bind(user.id).first();
  const fallbackDue = nextDueDate(occupancy.due_day);
  const currentPeriod = monthKey(new Date());

  return json({
    boarder: publicUser(user),
    occupancy: {
      id: occupancy.occupancy_id,
      roomId: occupancy.room_id,
      roomNumber: occupancy.room_number,
      floor: occupancy.floor,
      monthlyRate: Number(occupancy.monthly_rate),
      dueDay: occupancy.due_day
    },
    bills: normalizedBills,
    receiptUploadAvailable: Boolean(env.RECEIPTS),
    totalDue: round2(normalizedBills.reduce((sum, item) => sum + item.balance, 0)),
    depositBalance: round2(Number(profile?.depositBalance || 0)),
    oldestUnpaidDueDate,
    today,
    overdueAmount,
    overdueSince,
    latestPaymentPromise: (promises || []).find(p => Number(p.createdBy) === Number(user.id) && p.promisedDate) || null,
    promises: promises || [],
    bill: bill ? {
      id: bill.id,
      period: bill.period,
      dueDate: bill.dueDate,
      rentDueDate: bill.rentDueDate,
      electricityDueDate: bill.electricityDueDate,
      waterDueDate: bill.waterDueDate,
      roomRent: Number(bill.roomRent),
      electricityAmount: Number(bill.electricityAmount),
      electricityConsumption: Number(bill.electricityConsumption),
      electricityRate: Number(bill.electricityRate),
      waterAmount: Number(bill.waterAmount),
      totalAmount: Number(bill.totalAmount),
      status: bill.status
    } : {
      id: null,
      period: currentPeriod,
      dueDate: fallbackDue,
      rentDueDate: fallbackDue,
      electricityDueDate: billingDueDate(currentPeriod, settings.electricity_due_day),
      waterDueDate: billingDueDate(currentPeriod, settings.water_due_day),
      roomRent: Number(occupancy.monthly_rate),
      electricityAmount: 0,
      electricityConsumption: 0,
      electricityRate: Number(settings.electricity_rate || 0),
      waterAmount: 0,
      totalAmount: Number(occupancy.monthly_rate),
      status: "unbilled"
    },
    bank: {
      name: settings.bank_name || "",
      accountName: settings.bank_account_name || "",
      accountNumber: settings.bank_account_number || ""
    },
    landlady: {
      name: settings.landlady_name || "",
      email: settings.landlady_email || "",
      phone: settings.landlady_phone || ""
    },
    payments: payments || [],
    complaints: complaints || []
  });
}

async function submitPaymentReceipt(request, env, user) {
  const form = await request.formData();
  const file = form.get("receipt");
  const billingId = Number(form.get("billingId"));
  const declaredAmount = Number(form.get("amount"));
  const paymentDate = cleanText(form.get("paymentDate"), 20);
  const referenceNumber = cleanText(form.get("referenceNumber"), 120);
  const paymentType = cleanText(form.get("paymentType"), 20);
  if (!["rent","electricity","water"].includes(paymentType)) throw new HttpError(400,"Choose Rent, Electricity, or Water");
  if (!env.RECEIPTS) throw new HttpError(503,"Receipt uploads are unavailable until Cloudflare R2 is enabled");

  if (!(file instanceof File)) throw new HttpError(400, "Receipt file is required");
  if (!billingId) throw new HttpError(400, "A generated bill is required before uploading payment");
  if (!(declaredAmount > 0)) throw new HttpError(400, "Payment amount must be greater than zero");
  if (file.size > MAX_RECEIPT_BYTES) throw new HttpError(413, "Receipt must be 5 MB or smaller");
  if (!ALLOWED_RECEIPT_TYPES.has(file.type)) throw new HttpError(415, "Receipt must be JPG, PNG, WEBP, or PDF");

  const bill = await env.DB.prepare("SELECT * FROM billing_cycles WHERE id=? AND boarder_id=? AND status='unpaid'")
    .bind(billingId, user.id).first();
  if (!bill) throw new HttpError(404, "Unpaid bill not found");

  const paid = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE billing_id=? AND payment_type=?")
    .bind(billingId,paymentType).first();
  const charge = Number(paymentType === "rent" ? bill.room_rent : paymentType === "electricity" ? bill.electricity_amount : bill.water_amount);
  const remaining = round2(charge-Number(paid?.amount || 0));
  if (remaining <= 0) throw new HttpError(409,"This charge is already paid");
  if (declaredAmount > remaining + 0.001) throw new HttpError(400,"Amount exceeds the remaining charge");
  const existing = await env.DB.prepare("SELECT id FROM payment_submissions WHERE billing_id=? AND boarder_id=? AND payment_type=? AND status='pending'")
    .bind(billingId, user.id,paymentType).first();
  if (existing) throw new HttpError(409, "A receipt is already pending review for this charge");

  const bytes = await file.arrayBuffer();
  const receiptHash = await sha256HexBytes(new Uint8Array(bytes));
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "receipt";
  const key = `receipts/${user.id}/${crypto.randomUUID()}-${safeName}`;

  await env.RECEIPTS.put(key, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { boarderId: String(user.id), billingId: String(billingId) }
  });
  try {
    const result = await env.DB.prepare(`
      INSERT INTO payment_submissions
      (boarder_id,billing_id,declared_amount,payment_date,reference_number,receipt_r2_key,receipt_hash,mime_type,original_filename,payment_type)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(user.id, billingId, declaredAmount, paymentDate || null, referenceNumber || null, key, receiptHash, file.type, safeName,paymentType).run();
    return json({ ok: true, submissionId: result.meta?.last_row_id, message: "Receipt submitted for verification." }, 201);
  } catch (error) {
    await env.RECEIPTS.delete(key);
    throw error;
  }
}

async function submitBoarderPaymentPromise(request, env, user) {
  const body = await readJson(request);
  const promisedDate = requireText(body.promisedDate, "Payment date", 10);
  const today = manilaDate(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(promisedDate)) {
    throw new HttpError(400, "Choose a valid payment date");
  }

  if (promisedDate < today) {
    throw new HttpError(400, "Payment date cannot be in the past");
  }

  const settings = await getSettings(env.DB);
  const { results: bills } = await env.DB.prepare(`
    SELECT
      b.id,
      b.billing_period AS period,
      b.due_date AS rentDueDate,
      b.electricity_due_date AS storedElectricityDueDate,
      b.water_due_date AS storedWaterDueDate,
      b.room_rent AS rent,
      b.electricity_amount AS electricity,
      b.water_amount AS water,
      b.status,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
    FROM billing_cycles b
    WHERE b.boarder_id=? AND b.status!='void'
    ORDER BY b.billing_period
  `).bind(user.id).all();

  const overdue = [];

  for (const bill of bills || []) {
    if (bill.status === "paid") continue;

    const charges = [
      {
        type:"rent",
        amount:Math.max(0, Number(bill.rent || 0)-Number(bill.rentPaid || 0)-Number(bill.rentPending || 0)),
        dueDate:bill.rentDueDate
      },
      {
        type:"electricity",
        amount:Math.max(0, Number(bill.electricity || 0)-Number(bill.electricityPaid || 0)-Number(bill.electricityPending || 0)),
        dueDate:bill.storedElectricityDueDate || billingDueDate(bill.period, settings.electricity_due_day)
      },
      {
        type:"water",
        amount:Math.max(0, Number(bill.water || 0)-Number(bill.waterPaid || 0)-Number(bill.waterPending || 0)),
        dueDate:bill.storedWaterDueDate || billingDueDate(bill.period, settings.water_due_day)
      }
    ];

    for (const charge of charges) {
      if (charge.amount > 0.001 && charge.dueDate && charge.dueDate < today) {
        overdue.push({
          ...charge,
          billingId:bill.id
        });
      }
    }
  }

  if (!overdue.length) {
    throw new HttpError(409, "There is no uncovered overdue balance that needs a payment promise");
  }

  const overdueAmount = round2(overdue.reduce((sum, item) => sum + item.amount, 0));
  const oldest = overdue.slice().sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0];

  const result = await env.DB.prepare(`
    INSERT INTO payment_promises
    (boarder_id,billing_id,note,promised_date,created_by)
    VALUES (?,?,?,?,?)
  `).bind(
    user.id,
    oldest.billingId,
    "Boarder selected a payment date for the overdue balance.",
    promisedDate,
    user.id
  ).run();

  return json({
    ok:true,
    id:result.meta?.last_row_id,
    promisedDate,
    overdueAmount,
    message:"Payment date sent to the admin."
  }, 201);
}

async function createComplaint(request, env, user) {
  const body = await readJson(request);
  const occupancy = await env.DB.prepare("SELECT room_id FROM occupancies WHERE user_id=? AND status='active' LIMIT 1").bind(user.id).first();
  const category = requireText(body.category, "Category", 60);
  const description = requireText(body.description, "Description", 1500);
  const subject = cleanText(body.subject, 150) || category;
  const result = await env.DB.prepare(`
    INSERT INTO complaints (boarder_id,room_id,category,subject,description) VALUES (?,?,?,?,?)
  `).bind(user.id, occupancy?.room_id || null, category, subject, description).run();
  return json({ ok: true, complaintId: result.meta?.last_row_id }, 201);
}

async function boarderContract(env, user) {
  const contract = await env.DB.prepare("SELECT * FROM contracts WHERE active=1 ORDER BY id DESC LIMIT 1").first();
  if (!contract) return json({ contract: null });
  const accepted = await env.DB.prepare("SELECT accepted_at FROM contract_acceptances WHERE contract_id=? AND boarder_id=?")
    .bind(contract.id, user.id).first();
  return json({ contract: { id: contract.id, version: contract.version, title: contract.title, content: contract.content, acceptedAt: accepted?.accepted_at || null } });
}

async function adminPaymentPromiseReminders(env, settings, today) {
  const { results: promises } = await env.DB.prepare(`
    SELECT
      pp.id,
      pp.boarder_id AS boarderId,
      pp.promised_date AS promisedDate,
      pp.created_at AS createdAt,
      u.full_name AS boarder,
      r.room_number AS roomNumber
    FROM payment_promises pp
    JOIN users u ON u.id=pp.boarder_id
    LEFT JOIN occupancies o ON o.user_id=pp.boarder_id AND o.status='active'
    LEFT JOIN rooms r ON r.id=o.room_id
    WHERE pp.created_by=pp.boarder_id
      AND pp.promised_date IS NOT NULL
      AND u.deleted_at IS NULL
      AND pp.id=(
        SELECT p2.id
        FROM payment_promises p2
        WHERE p2.boarder_id=pp.boarder_id
          AND p2.created_by=p2.boarder_id
          AND p2.promised_date IS NOT NULL
        ORDER BY p2.id DESC
        LIMIT 1
      )
    ORDER BY pp.promised_date, u.full_name
  `).all();

  if (!(promises || []).length) return [];

  const boarderIds = [...new Set(promises.map(p => Number(p.boarderId)).filter(Boolean))];
  const placeholders = boarderIds.map(() => "?").join(",");

  const { results: bills } = await env.DB.prepare(`
    SELECT
      b.id,
      b.boarder_id AS boarderId,
      b.billing_period AS period,
      b.due_date AS rentDueDate,
      b.electricity_due_date AS storedElectricityDueDate,
      b.water_due_date AS storedWaterDueDate,
      b.room_rent AS rent,
      b.electricity_amount AS electricity,
      b.water_amount AS water,
      b.status,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
    FROM billing_cycles b
    WHERE b.status!='void'
      AND b.boarder_id IN (${placeholders})
  `).bind(...boarderIds).all();

  const balances = new Map();

  for (const bill of bills || []) {
    if (bill.status === "paid") continue;

    const charges = [
      {
        amount:Math.max(0, Number(bill.rent || 0)-Number(bill.rentPaid || 0)-Number(bill.rentPending || 0)),
        dueDate:bill.rentDueDate
      },
      {
        amount:Math.max(0, Number(bill.electricity || 0)-Number(bill.electricityPaid || 0)-Number(bill.electricityPending || 0)),
        dueDate:bill.storedElectricityDueDate || billingDueDate(bill.period, settings.electricity_due_day)
      },
      {
        amount:Math.max(0, Number(bill.water || 0)-Number(bill.waterPaid || 0)-Number(bill.waterPending || 0)),
        dueDate:bill.storedWaterDueDate || billingDueDate(bill.period, settings.water_due_day)
      }
    ];

    const current = balances.get(Number(bill.boarderId)) || {
      overdueAmount:0,
      overdueSince:null
    };

    for (const charge of charges) {
      if (charge.amount > 0.001 && charge.dueDate && charge.dueDate < today) {
        current.overdueAmount = round2(current.overdueAmount + charge.amount);
        if (!current.overdueSince || charge.dueDate < current.overdueSince) {
          current.overdueSince = charge.dueDate;
        }
      }
    }

    balances.set(Number(bill.boarderId), current);
  }

  return (promises || [])
    .map(p => {
      const balance = balances.get(Number(p.boarderId)) || {
        overdueAmount:0,
        overdueSince:null
      };

      return {
        ...p,
        overdueAmount:round2(balance.overdueAmount),
        overdueSince:balance.overdueSince,
        reminderStatus:
          p.promisedDate < today
            ? "Promise overdue"
            : p.promisedDate === today
              ? "Due today"
              : "Upcoming"
      };
    })
    .filter(p => p.overdueAmount > 0.001);
}

async function adminDashboard(env) {
  const today = manilaDate(new Date());
  const threeDays = manilaDate(new Date(Date.now() + 3 * 86400000));
  const settings = await getSettings(env.DB);

  const [occupied, vacant, pending, applicants, complaints, dueSoon] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS c FROM rooms WHERE status='occupied'").first(),
    env.DB.prepare("SELECT COUNT(*) AS c FROM rooms WHERE status='vacant'").first(),
    env.DB.prepare("SELECT COUNT(*) AS c FROM payment_submissions WHERE status='pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS c FROM applicants WHERE status='new'").first(),
    env.DB.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status IN ('submitted','seen','in_progress')").first(),
    env.DB.prepare(`
      SELECT b.id,b.due_date AS dueDate,b.total_amount AS totalAmount,r.room_number AS roomNumber,u.full_name AS boarder
      FROM billing_cycles b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.boarder_id
      WHERE b.status='unpaid' AND b.due_date BETWEEN ? AND ? ORDER BY b.due_date
    `).bind(today, threeDays).all()
  ]);

  const paymentReminders = await adminPaymentPromiseReminders(env, settings, today);
  const actionableReminders = paymentReminders.filter(item => item.promisedDate <= today).length;

  return json({
    counts: {
      occupiedRooms: Number(occupied?.c || 0),
      vacantRooms: Number(vacant?.c || 0),
      pendingReceipts: Number(pending?.c || 0),
      newApplicants: Number(applicants?.c || 0),
      complaints: Number(complaints?.c || 0),
      dueSoon: (dueSoon.results || []).length,
      paymentReminders: actionableReminders
    },
    dueSoon: dueSoon.results || [],
    paymentReminders
  });
}

async function adminRooms(env) {
  const settings = await getSettings(env.DB);
  const waterRate = Number(settings.water_monthly_amount || 0);
  const { results } = await env.DB.prepare(`
    SELECT r.id,r.room_number AS roomNumber,r.floor,r.monthly_rate AS monthlyRate,r.status,
           u.id AS boarderId,u.full_name AS boarder,u.email,u.phone,o.id AS occupancyId,o.due_day AS dueDay,o.started_at AS startedAt,
           (
             SELECT e.current_reading
             FROM electricity_readings e
             WHERE e.room_id=r.id
             ORDER BY e.billing_period DESC,e.id DESC
             LIMIT 1
           ) AS lastElectricityReading,
           (
             SELECT e.billing_period
             FROM electricity_readings e
             WHERE e.room_id=r.id
             ORDER BY e.billing_period DESC,e.id DESC
             LIMIT 1
           ) AS lastElectricityPeriod
    FROM rooms r
    LEFT JOIN occupancies o ON o.room_id=r.id AND o.status='active'
    LEFT JOIN users u ON u.id=o.user_id
    ORDER BY r.floor,r.room_number
  `).all();
  const rooms = (results || []).map(row => ({ ...row, waterRate }));
  const { results: availableBoarders } = await env.DB.prepare(`
    SELECT u.id,u.full_name AS fullName,u.email,u.phone,u.status
    FROM users u
    LEFT JOIN occupancies o ON o.user_id=u.id AND o.status='active'
    WHERE u.role='boarder' AND u.deleted_at IS NULL AND o.id IS NULL
    ORDER BY u.full_name
  `).all();
  const { results: balances } = await env.DB.prepare(`
    SELECT b.room_id AS roomId,b.boarder_id AS boarderId,b.billing_period AS billingPeriod,b.due_date AS dueDate,b.electricity_due_date AS electricityDueDate,b.water_due_date AS waterDueDate,b.status AS billStatus,b.room_rent AS rent,b.electricity_amount AS electricity,b.water_amount AS water,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
    FROM billing_cycles b WHERE b.status!='void'
      AND b.boarder_id IN (SELECT user_id FROM occupancies WHERE status='active')
  `).all();
  const today = manilaDate(new Date());
  const statusFor = (rows,type) => {
    if (!rows.length) return "Due";
    const outstanding = rows.map(x => ({
      ...x,
      chargeDueDate: type === "rent"
        ? x.dueDate
        : (type === "electricity" ? x.electricityDueDate : x.waterDueDate) || billingDueDate(
            x.billingPeriod,
            type === "electricity" ? settings.electricity_due_day : settings.water_due_day
          ),
      balance: x.billStatus === "paid" ? 0 : Math.max(0, Number(x[type] || 0)-Number(x[type+'Paid'] || 0)),
      uncovered: x.billStatus === "paid" ? 0 : Math.max(0, Number(x[type] || 0)-Number(x[type+'Paid'] || 0)-Number(x[type+'Pending'] || 0))
    }));
    if (outstanding.every(x => x.balance <= 0.001)) return "Paid";
    if (outstanding.some(x => x.chargeDueDate < today && x.uncovered > 0.001)) return "Overdue";
    if (outstanding.some(x => x.uncovered > 0.001)) return "Due";
    if (outstanding.some(x => Number(x[type+'Pending'] || 0) > 0)) return "Pending";
    return "Due";
  };
  return json({
    rooms: rooms.map(r => {
      const rows=(balances||[]).filter(b => b.roomId===r.id && b.boarderId===r.boarderId);
      return {...r,paymentStatus:r.boarderId?{rent:statusFor(rows,'rent'),electricity:statusFor(rows,'electricity'),water:statusFor(rows,'water')}:null};
    }),
    availableBoarders: availableBoarders || []
  });
}

async function createRoom(request, env, admin) {
  const body = await readJson(request);
  const roomNumber = requireText(body.roomNumber, "Room number", 30);
  const floor = Number(body.floor);
  const monthlyRate = Number(body.monthlyRate);
  if (![1,2].includes(floor)) throw new HttpError(400, "Floor must be 1 or 2");
  if (!(monthlyRate >= 0)) throw new HttpError(400, "Monthly rate is invalid");
  const result = await env.DB.prepare("INSERT INTO rooms (room_number,floor,monthly_rate,status) VALUES (?,?,?,'vacant')")
    .bind(roomNumber, floor, monthlyRate).run();
  await audit(env.DB, admin.id, "create_room", "room", result.meta?.last_row_id, { roomNumber, floor, monthlyRate });
  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}

async function updateRoom(request, env, admin, roomId) {
  const body = await readJson(request);
  const room = await env.DB.prepare("SELECT * FROM rooms WHERE id=?").bind(roomId).first();
  if (!room) throw new HttpError(404, "Room not found");

  const monthlyRate = body.monthlyRate == null ? Number(room.monthly_rate) : Number(body.monthlyRate);
  const status = body.status == null ? room.status : cleanText(body.status, 30);
  const roomNumber = body.roomNumber == null ? room.room_number : requireText(body.roomNumber,"Room number",30);
  const floor = body.floor == null ? Number(room.floor) : Number(body.floor);
  if (![1,2].includes(floor)) throw new HttpError(400,"Floor must be 1 or 2");
  if (!(monthlyRate >= 0)) throw new HttpError(400, "Monthly rate is invalid");
  if (!["vacant","occupied"].includes(status)) throw new HttpError(400, "Occupancy must be vacant or occupied");

  const current = await env.DB.prepare("SELECT id,user_id,due_day FROM occupancies WHERE room_id=? AND status='active' LIMIT 1").bind(roomId).first();
  const statements = [];
  let assignedBoarderId = null;
  let dueDay = null;

  if (status === "occupied") {
    assignedBoarderId = Number(body.boarderId || current?.user_id || 0);
    dueDay = Number(body.dueDay || current?.due_day || 1);
    if (!Number.isInteger(assignedBoarderId) || assignedBoarderId <= 0) throw new HttpError(400, "Choose a boarder for an occupied room");
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new HttpError(400, "Due day must be 1–28");
    const boarder = await env.DB.prepare("SELECT id FROM users WHERE id=? AND role='boarder' AND deleted_at IS NULL").bind(assignedBoarderId).first();
    if (!boarder) throw new HttpError(404, "Boarder not found");
    const otherOccupancy = await env.DB.prepare("SELECT id,room_id FROM occupancies WHERE user_id=? AND status='active' LIMIT 1").bind(assignedBoarderId).first();
    if (otherOccupancy && Number(otherOccupancy.room_id) !== Number(roomId)) throw new HttpError(409, "That boarder is already assigned to another room");

    if (current && Number(current.user_id) === assignedBoarderId) {
      statements.push(env.DB.prepare("UPDATE occupancies SET due_day=? WHERE id=?").bind(dueDay,current.id));
      statements.push(env.DB.prepare("UPDATE users SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(assignedBoarderId));
    } else {
      if (current) {
        statements.push(env.DB.prepare("UPDATE occupancies SET status='ended',ended_at=date('now') WHERE id=?").bind(current.id));
        statements.push(env.DB.prepare("UPDATE users SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.user_id));
        statements.push(env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(current.user_id));
      }
      statements.push(env.DB.prepare("INSERT INTO occupancies (user_id,room_id,due_day,status) VALUES (?,?,?,'active')").bind(assignedBoarderId,roomId,dueDay));
      statements.push(env.DB.prepare("UPDATE users SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(assignedBoarderId));
    }
  } else if (current) {
    statements.push(env.DB.prepare("UPDATE occupancies SET status='ended',ended_at=date('now') WHERE id=?").bind(current.id));
    statements.push(env.DB.prepare("UPDATE users SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(current.user_id));
    statements.push(env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(current.user_id));
  }

  statements.push(env.DB.prepare("UPDATE rooms SET room_number=?,floor=?,monthly_rate=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(roomNumber,floor,monthlyRate,status,roomId));
  statements.push(env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
    .bind(admin.id,"update_room","room",String(roomId),JSON.stringify({ roomNumber,floor,monthlyRate,status,boarderId:assignedBoarderId,dueDay })));
  await env.DB.batch(statements);

  let welcomeSmsSent = false;
  let welcomeSmsAttempted = false;
  const newlyAssigned =
    status === "occupied" &&
    assignedBoarderId &&
    (!current || Number(current.user_id) !== Number(assignedBoarderId));

  if (newlyAssigned) {
    const assigned = await env.DB.prepare(
      "SELECT id,full_name AS fullName,email,phone FROM users WHERE id=? AND role='boarder' LIMIT 1"
    ).bind(assignedBoarderId).first();

    if (assigned?.phone) {
      welcomeSmsAttempted = true;
      const welcome = await sendWelcomeSms(env, {
        boarderId: assigned.id,
        fullName: assigned.fullName,
        phone: assigned.phone,
        email: assigned.email,
        roomNumber
      });
      welcomeSmsSent = welcome.sent;
    }
  }

  return json({
    ok: true,
    welcomeSmsSent,
    welcomeSmsAttempted,
    message: welcomeSmsSent
      ? "Room updated. Welcome SMS sent to the assigned boarder."
      : welcomeSmsAttempted
        ? "Room updated, but the welcome SMS could not be sent. Check Semaphore configuration and the boarder's phone number."
        : "Room updated."
  });
}

async function adminPayments(env) {
  const { results } = await env.DB.prepare(`
    SELECT p.id,p.declared_amount AS amount,p.payment_date AS paymentDate,p.reference_number AS referenceNumber,
           p.status,p.payment_type AS paymentType,p.rejection_reason AS rejectionReason,p.submitted_at AS submittedAt,
           u.full_name AS boarder,u.email,r.room_number AS roomNumber,b.billing_period AS period,b.total_amount AS billTotal
    FROM payment_submissions p
    JOIN users u ON u.id=p.boarder_id
    JOIN billing_cycles b ON b.id=p.billing_id
    JOIN rooms r ON r.id=b.room_id
    ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END,p.submitted_at DESC
  `).all();
  return json({ submissions: results || [] });
}

async function getReceipt(env, submissionId) {
  const submission = await env.DB.prepare("SELECT receipt_r2_key,mime_type,original_filename FROM payment_submissions WHERE id=?")
    .bind(submissionId).first();
  if (!submission) throw new HttpError(404, "Payment submission not found");
  if (!env.RECEIPTS) throw new HttpError(503,"Receipt storage is not enabled");
  const object = await env.RECEIPTS.get(submission.receipt_r2_key);
  if (!object) throw new HttpError(404, "Receipt file not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", submission.mime_type || headers.get("content-type") || "application/octet-stream");
  headers.set("content-disposition", `inline; filename="${String(submission.original_filename || "receipt").replace(/\"/g, "")}"`);
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}

async function approvePayment(request, env, admin, submissionId) {
  let body = {};
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    try { body = await request.json(); }
    catch { throw new HttpError(400,"Invalid JSON body"); }
  }
  const paidInFull = body.paidInFull === true;
  const row = await env.DB.prepare(`
    SELECT
      p.*,
      b.room_id,
      b.billing_period,
      b.room_rent,
      b.electricity_amount,
      b.water_amount,
      b.status AS bill_status,
      u.full_name AS boarder,
      u.phone
    FROM payment_submissions p
    JOIN billing_cycles b ON b.id=p.billing_id
    JOIN users u ON u.id=p.boarder_id
    WHERE p.id=? AND p.status='pending'
  `).bind(submissionId).first();
  if (!row) throw new HttpError(404, "Pending payment submission not found");
  if (row.bill_status !== "unpaid") throw new HttpError(409, "This bill is no longer unpaid");
  const paid = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE billing_id=? AND payment_type=?")
    .bind(row.billing_id,row.payment_type).first();
  const charge = Number(row.payment_type === "rent" ? row.room_rent : row.payment_type === "electricity" ? row.electricity_amount : row.water_amount);
  const remainingCharge = round2(Math.max(0, charge-Number(paid?.amount || 0)));
  if (remainingCharge <= 0.001) throw new HttpError(409,"This charge is already paid");
  const approvedAmount = paidInFull ? remainingCharge : round2(Number(row.declared_amount));
  if (!(approvedAmount > 0)) throw new HttpError(400,"Payment amount must be greater than zero");
  if (approvedAmount>remainingCharge+0.001) throw new HttpError(409,"Payment exceeds remaining charge");
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO payments
      (boarder_id,room_id,billing_id,billing_period,amount,payment_date,reference_number,receipt_hash,verified_by,payment_type)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(row.boarder_id,row.room_id,row.billing_id,row.billing_period,approvedAmount,row.payment_date,row.reference_number,row.receipt_hash,admin.id,row.payment_type),
    env.DB.prepare("DELETE FROM payment_submissions WHERE id=?").bind(submissionId),
    env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"approve_payment","payment_submission",String(submissionId),JSON.stringify({ billingId: row.billing_id, declaredAmount: row.declared_amount, approvedAmount, paidInFull, type: row.payment_type }))
  ]);
  const balance = await env.DB.prepare(`SELECT b.total_amount-COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id),0) AS amount FROM billing_cycles b WHERE b.id=?`).bind(row.billing_id).first();
  if (Number(balance?.amount || 0)<=0.001) await env.DB.prepare("UPDATE billing_cycles SET status='paid',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.billing_id).run();

  let receiptDeleted = true;
  try {
    if (!env.RECEIPTS) throw new Error("R2 not enabled");
    await env.RECEIPTS.delete(row.receipt_r2_key);
  } catch (error) {
    receiptDeleted = false;
    await env.DB.prepare(`
      INSERT INTO receipt_cleanup_queue (r2_key,last_error,attempts) VALUES (?,?,1)
      ON CONFLICT(r2_key) DO UPDATE SET last_error=excluded.last_error,attempts=attempts+1,updated_at=CURRENT_TIMESTAMP
    `).bind(row.receipt_r2_key, String(error?.message || error).slice(0,500)).run();
  }
  let paymentSmsSent = false;
  let paymentSmsAttempted = false;

  if (row.phone) {
    paymentSmsAttempted = true;
    const paymentLabel = titleCaseSms(row.payment_type || "payment");
    const message =
      `Casa Vicenta: Thank you${row.boarder ? `, ${cleanText(row.boarder, 80)}` : ""}! ` +
      `Your ${paymentLabel} payment of ${formatPesoForSms(approvedAmount)} for ${smsMonthLabel(row.billing_period)} ` +
      `has been approved and recorded.`;

    const notification = await sendSmsLogged(env, {
      boarderId: Number(row.boarder_id),
      phone: row.phone,
      notificationType: "payment_approved",
      eventKey: `payment-approved:${submissionId}`,
      message
    });

    paymentSmsSent = notification.sent;
  }

  const receiptMessage = receiptDeleted
    ? "Payment recorded and receipt deleted."
    : "Payment recorded; receipt cleanup was queued for retry.";

  const smsMessage = paymentSmsSent
    ? " Thank-you SMS sent to the boarder."
    : paymentSmsAttempted
      ? " The payment was recorded, but the thank-you SMS could not be sent. Check Semaphore configuration and the boarder's phone number."
      : " The payment was recorded. The boarder has no phone number for SMS.";

  return json({
    ok: true,
    receiptDeleted,
    approvedAmount,
    paidInFull,
    paymentSmsSent,
    paymentSmsAttempted,
    message: receiptMessage + smsMessage
  });
}

async function rejectPayment(request, env, admin, submissionId) {
  const body = await readJson(request);
  const reason = requireText(body.reason, "Rejection reason", 500);
  const result = await env.DB.prepare("UPDATE payment_submissions SET status='rejected',rejection_reason=? WHERE id=? AND status='pending'")
    .bind(reason, submissionId).run();
  if (!result.meta?.changes) throw new HttpError(404, "Pending payment submission not found");
  await audit(env.DB, admin.id, "reject_payment", "payment_submission", submissionId, { reason });
  return json({ ok: true });
}

async function adminApplicants(env) {
  const [
    { results },
    { results: vacantRooms },
    { results: requests }
  ] = await Promise.all([
    env.DB.prepare(`
      SELECT
        a.id,
        a.full_name AS fullName,
        a.phone,
        a.facebook,
        a.occupation_school AS occupationSchool,
        a.preferred_floor AS preferredFloor,
        a.preferred_move_in AS preferredMoveIn,
        a.occupants,
        a.emergency_contact AS emergencyContact,
        a.status,
        a.created_at AS createdAt,
        v.scheduled_at AS scheduledAt
      FROM applicants a
      LEFT JOIN viewing_schedules v
        ON v.id=(
          SELECT id
          FROM viewing_schedules
          WHERE applicant_id=a.id
            AND cancelled_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        )
      ORDER BY a.created_at DESC
    `).all(),

    env.DB.prepare(
      "SELECT id,room_number AS roomNumber,floor,monthly_rate AS monthlyRate FROM rooms WHERE status='vacant' ORDER BY floor,room_number"
    ).all(),

    env.DB.prepare(`
      SELECT
        ar.id,
        ar.applicant_id AS applicantId,
        a.full_name AS applicant,
        a.phone,
        ar.request_type AS requestType,
        ar.current_viewing_at AS currentViewingAt,
        ar.requested_viewing_at AS requestedViewingAt,
        ar.message,
        ar.status,
        ar.admin_reply AS adminReply,
        ar.created_at AS createdAt,
        ar.reviewed_at AS reviewedAt
      FROM applicant_requests ar
      JOIN applicants a ON a.id=ar.applicant_id
      ORDER BY
        CASE ar.status
          WHEN 'new' THEN 0
          WHEN 'reviewed' THEN 1
          ELSE 2
        END,
        ar.created_at DESC
    `).all()
  ]);

  return json({
    applicants: results || [],
    vacantRooms: vacantRooms || [],
    requests: requests || []
  });
}

async function scheduleApplicant(request, env, admin, applicantId) {
  const body = await readJson(request);
  const scheduledAt = requireText(body.scheduledAt, "Viewing date and time", 40);
  const notes = cleanText(body.notes, 500);

  const applicant = await env.DB.prepare("SELECT * FROM applicants WHERE id=?").bind(applicantId).first();
  if (!applicant) throw new HttpError(404, "Applicant not found");
  if (["accepted","declined"].includes(applicant.status)) throw new HttpError(409, "This application is already closed");

  const result = await env.DB.batch([
    env.DB.prepare("UPDATE viewing_schedules SET cancelled_at=CURRENT_TIMESTAMP WHERE applicant_id=? AND cancelled_at IS NULL")
      .bind(applicantId),
    env.DB.prepare("INSERT INTO viewing_schedules (applicant_id,scheduled_at,notes,created_by) VALUES (?,?,?,?)")
      .bind(applicantId, scheduledAt, notes || null, admin.id),
    env.DB.prepare("UPDATE applicants SET status='scheduled',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(applicantId),
    env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"schedule_viewing","applicant",String(applicantId),JSON.stringify({ scheduledAt }))
  ]);

  const scheduleId = result[1]?.meta?.last_row_id;
  let smsSent = false;
  let smsAttempted = false;

  if (applicant.phone) {
    smsAttempted = true;
    const contact = applicantContactLinkText(env, "Need to reschedule or send us a message");
    const message =
      `Casa Vicenta: Your viewing is scheduled for ${smsDateTimeLabel(scheduledAt)}. ` +
      `We will remind you 3 days before and again on the day of your viewing. ${contact}`;

    const notification = await sendSmsLogged(env, {
      boarderId: null,
      phone: applicant.phone,
      notificationType: "viewing_scheduled",
      eventKey: `viewing-scheduled:${scheduleId || applicantId}:${scheduledAt}`,
      message
    });

    smsSent = notification.sent;
  }

  return json({
    ok: true,
    scheduleId,
    smsSent,
    smsAttempted,
    message: smsSent
      ? "Viewing schedule saved. Confirmation SMS sent to the applicant."
      : smsAttempted
        ? "Viewing schedule saved, but the confirmation SMS could not be sent. Check Semaphore configuration and the applicant's phone number."
        : "Viewing schedule saved. The applicant has no phone number for SMS."
  });
}

async function declineApplicant(env, admin, applicantId) {
  const applicant = await env.DB.prepare(
    "SELECT id,status,full_name AS fullName,phone FROM applicants WHERE id=?"
  ).bind(applicantId).first();

  if (!applicant) throw new HttpError(404,"Applicant not found");
  if (applicant.status === "accepted") throw new HttpError(409,"An accepted applicant cannot be declined");

  if (applicant.status !== "declined") {
    await env.DB.batch([
      env.DB.prepare("UPDATE applicants SET status='declined',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(applicantId),
      env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
        .bind(admin.id,"decline_applicant","applicant",String(applicantId),null)
    ]);
  }

  let smsSent = false;
  let smsAttempted = false;

  if (applicant.phone) {
    smsAttempted = true;
    const contact = applicantContactLinkText(env, "Questions");
    const message =
      `Casa Vicenta: Thank you for your interest${applicant.fullName ? `, ${cleanText(applicant.fullName, 80)}` : ""}. ` +
      `Your boarding application has been declined at this time. ${contact}`;

    const notification = await sendSmsLogged(env, {
      boarderId: null,
      phone: applicant.phone,
      notificationType: "applicant_declined",
      eventKey: `applicant-declined:${applicantId}`,
      message
    });

    smsSent = notification.sent;
  }

  return json({
    ok:true,
    smsSent,
    smsAttempted,
    message: smsSent
      ? "Applicant declined. Decline notification SMS sent."
      : smsAttempted
        ? "Applicant declined, but the SMS could not be sent. Check Semaphore configuration and the applicant's phone number."
        : "Applicant declined. The applicant has no phone number for SMS."
  });
}


async function updateApplicantRequest(request, env, admin, requestId) {
  const body = await readJson(request);
  const status = cleanText(body.status, 20);
  const adminReply = cleanText(body.adminReply, 1000);

  if (!["reviewed", "done"].includes(status)) {
    throw new HttpError(400, "Applicant request status must be reviewed or done");
  }

  const row = await env.DB.prepare(`
    SELECT
      ar.id,
      ar.request_type AS requestType,
      ar.status,
      a.id AS applicantId,
      a.full_name AS applicant,
      a.phone,
      a.status AS applicantStatus
    FROM applicant_requests ar
    JOIN applicants a ON a.id=ar.applicant_id
    WHERE ar.id=?
  `).bind(requestId).first();

  if (!row) throw new HttpError(404, "Applicant request not found");

  const statements = [
    env.DB.prepare(`
      UPDATE applicant_requests
      SET status=?,admin_reply=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(status, adminReply || null, admin.id, requestId)
  ];

  const confirmingCancellation = row.requestType === "cancel" && status === "done";

  if (confirmingCancellation) {
    statements.push(
      env.DB.prepare(`
        UPDATE viewing_schedules
        SET cancelled_at=CURRENT_TIMESTAMP
        WHERE id=(
          SELECT id
          FROM viewing_schedules
          WHERE applicant_id=?
            AND cancelled_at IS NULL
          ORDER BY id DESC
          LIMIT 1
        )
      `).bind(row.applicantId)
    );

    if (!["accepted", "declined"].includes(row.applicantStatus)) {
      statements.push(
        env.DB.prepare(
          "UPDATE applicants SET status='new',updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(row.applicantId)
      );
    }
  }

  await env.DB.batch(statements);

  let smsSent = false;
  let smsAttempted = false;

  if (adminReply && row.phone) {
    smsAttempted = true;
    const requestName = applicantRequestTypeLabel(row.requestType);
    const contact = applicantContactLinkText(env, "Send another message or request");
    const notification = await sendSmsLogged(env, {
      boarderId: null,
      phone: row.phone,
      notificationType: "applicant_request_reply",
      eventKey: `applicant-request-reply:${requestId}:${crypto.randomUUID()}`,
      message: `Casa Vicenta: Reply to your ${requestName}: ${adminReply}. ${contact}`
    });
    smsSent = notification.sent;
  } else if (confirmingCancellation && row.phone) {
    smsAttempted = true;
    const contact = applicantContactLinkText(env, "Request another viewing or send us a message");
    const notification = await sendSmsLogged(env, {
      boarderId: null,
      phone: row.phone,
      notificationType: "viewing_cancelled",
      eventKey: `viewing-cancelled:${requestId}`,
      message: `Casa Vicenta: Your scheduled viewing has been cancelled. ${contact}`
    });
    smsSent = notification.sent;
  }

  await audit(env.DB, admin.id, "update_applicant_request", "applicant_request", requestId, {
    status,
    replied: Boolean(adminReply),
    viewingCancelled: confirmingCancellation
  });

  return json({
    ok: true,
    smsSent,
    smsAttempted,
    message: adminReply
      ? smsSent
        ? "Reply sent and applicant request updated."
        : smsAttempted
          ? "Applicant request updated, but the SMS reply could not be sent."
          : "Applicant request updated. The applicant has no phone number for SMS."
      : confirmingCancellation
        ? smsSent
          ? "Viewing cancelled and confirmation SMS sent."
          : smsAttempted
            ? "Viewing cancelled, but the confirmation SMS could not be sent."
            : "Viewing cancelled. The applicant has no phone number for SMS."
        : "Applicant request updated."
  });
}

async function acceptApplicantRescheduleRequest(env, admin, requestId) {
  const row = await env.DB.prepare(`
    SELECT
      ar.id,
      ar.applicant_id AS applicantId,
      ar.request_type AS requestType,
      ar.requested_viewing_at AS requestedViewingAt,
      ar.status AS requestStatus,
      a.full_name AS applicant,
      a.phone,
      a.status AS applicantStatus
    FROM applicant_requests ar
    JOIN applicants a ON a.id=ar.applicant_id
    WHERE ar.id=?
  `).bind(requestId).first();

  if (!row) throw new HttpError(404, "Applicant request not found");
  if (row.requestType !== "reschedule" || !row.requestedViewingAt) {
    throw new HttpError(409, "This request does not contain a new viewing schedule");
  }
  if (row.requestStatus === "done") {
    throw new HttpError(409, "This applicant request is already completed");
  }
  if (["accepted", "declined"].includes(row.applicantStatus)) {
    throw new HttpError(409, "This application is already closed");
  }

  const result = await env.DB.batch([
    env.DB.prepare(
      "UPDATE viewing_schedules SET cancelled_at=CURRENT_TIMESTAMP WHERE applicant_id=? AND cancelled_at IS NULL"
    ).bind(row.applicantId),
    env.DB.prepare(
      "INSERT INTO viewing_schedules (applicant_id,scheduled_at,notes,created_by) VALUES (?,?,?,?)"
    ).bind(
      row.applicantId,
      row.requestedViewingAt,
      `Accepted from applicant request #${requestId}`,
      admin.id
    ),
    env.DB.prepare(
      "UPDATE applicants SET status='scheduled',updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(row.applicantId),
    env.DB.prepare(`
      UPDATE applicant_requests
      SET status='done',admin_reply=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(
      `Viewing rescheduled to ${row.requestedViewingAt}`,
      admin.id,
      requestId
    ),
    env.DB.prepare(
      "INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)"
    ).bind(
      admin.id,
      "accept_applicant_reschedule",
      "applicant_request",
      String(requestId),
      JSON.stringify({
        applicantId: row.applicantId,
        scheduledAt: row.requestedViewingAt
      })
    )
  ]);

  const scheduleId = result[1]?.meta?.last_row_id;
  let smsSent = false;
  let smsAttempted = false;

  if (row.phone) {
    smsAttempted = true;
    const contact = applicantContactLinkText(env, "Need another change");
    const notification = await sendSmsLogged(env, {
      boarderId: null,
      phone: row.phone,
      notificationType: "viewing_rescheduled",
      eventKey: `viewing-rescheduled:${scheduleId || requestId}:${row.requestedViewingAt}`,
      message:
        `Casa Vicenta: Your viewing has been rescheduled to ${smsDateTimeLabel(row.requestedViewingAt)}. ` +
        `We will remind you 3 days before and again on the day of your viewing. ${contact}`
    });
    smsSent = notification.sent;
  }

  return json({
    ok: true,
    scheduleId,
    smsSent,
    smsAttempted,
    message: smsSent
      ? "Viewing rescheduled and confirmation SMS sent."
      : smsAttempted
        ? "Viewing rescheduled, but the confirmation SMS could not be sent."
        : "Viewing rescheduled. The applicant has no phone number for SMS."
  });
}

async function addApplicantAsBoarder(request, env, admin, applicantId) {
  const body = await readJson(request);
  const applicant = await env.DB.prepare("SELECT * FROM applicants WHERE id=?").bind(applicantId).first();
  if (!applicant) throw new HttpError(404,"Applicant not found");
  if (applicant.status === "accepted") throw new HttpError(409,"Applicant is already a boarder");
  if (applicant.status === "declined") throw new HttpError(409,"Declined applicants must be reopened before adding them as a boarder");
  const result = await createBoarderRecord(env,admin,{
    fullName:applicant.full_name,email:applicant.email,phone:applicant.phone,facebook:applicant.facebook,
    roomId:body.roomId,dueDay:body.dueDay,occupationSchool:applicant.occupation_school,
    preferredMoveIn:applicant.preferred_move_in,preferredFloor:applicant.preferred_floor,
    occupants:applicant.occupants,emergencyContact:applicant.emergency_contact,notes:applicant.notes,deposit:body.deposit,applicantId
  });
  return json({
    ok:true,
    id:result.id,
    occupancyId:result.occupancyId,
    welcomeSmsSent:Boolean(result.welcomeSmsSent),
    welcomeSmsAttempted:Boolean(result.welcomeSmsAttempted),
    message: result.welcomeSmsSent
      ? "Applicant added as boarder. Welcome SMS sent."
      : "Applicant added as boarder, but the welcome SMS could not be sent. Check Semaphore configuration and the boarder's phone number."
  },201);
}

async function adminComplaints(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      c.id,
      c.boarder_id AS boarderId,
      c.category,
      c.subject,
      c.description,
      c.request_type AS requestType,
      c.status,
      c.admin_notes AS adminNotes,
      c.created_at AS createdAt,
      u.full_name AS boarder,
      u.phone,
      r.room_number AS roomNumber
    FROM complaints c
    JOIN users u ON u.id=c.boarder_id
    LEFT JOIN rooms r ON r.id=c.room_id
    ORDER BY CASE c.status WHEN 'submitted' THEN 0 WHEN 'seen' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,c.created_at DESC
  `).all();
  return json({ complaints: results || [] });
}

async function updateComplaint(request, env, admin, complaintId) {
  const body = await readJson(request);
  const status = requireText(body.status, "Status", 30);
  const notes = cleanText(body.adminNotes, 700);

  if (!["submitted","seen","in_progress","resolved","closed"].includes(status)) {
    throw new HttpError(400, "Invalid complaint status");
  }

  const complaint = await env.DB.prepare(`
    SELECT
      c.id,
      c.boarder_id AS boarderId,
      c.category,
      c.subject,
      c.description,
      c.request_type AS requestType,
      c.status,
      u.full_name AS boarder,
      u.phone
    FROM complaints c
    JOIN users u ON u.id=c.boarder_id
    WHERE c.id=?
    LIMIT 1
  `).bind(complaintId).first();

  if (!complaint) throw new HttpError(404, "Complaint not found");

  if (
    status === "resolved" &&
    complaint.requestType !== "password_reset" &&
    !notes
  ) {
    throw new HttpError(400, "Enter what was done to resolve the complaint");
  }

  await env.DB.prepare(
    "UPDATE complaints SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(status, notes || null, complaintId).run();

  await audit(env.DB, admin.id, "update_complaint", "complaint", complaintId, {
    status,
    resolution: notes || null
  });

  let smsSent = false;

  if (
    status === "resolved" &&
    complaint.status !== "resolved" &&
    complaint.requestType !== "password_reset" &&
    complaint.phone
  ) {
    const subject = cleanText(complaint.subject || complaint.category || "complaint", 100);
    const message = `Casa Vicenta: Your complaint "${subject}" has been resolved. Resolution: ${notes}`;

    const notification = await sendSmsLogged(env, {
      boarderId: Number(complaint.boarderId),
      phone: complaint.phone,
      notificationType: "complaint_resolved",
      eventKey: `complaint-resolved:${complaintId}`,
      message
    });

    smsSent = notification.sent;
  }

  return json({
    ok: true,
    smsSent,
    message:
      status === "resolved" && complaint.requestType !== "password_reset"
        ? smsSent
          ? "Complaint marked resolved. Resolution SMS sent to the boarder."
          : "Complaint marked resolved, but the SMS could not be sent. Check the boarder's phone number and Semaphore configuration."
        : "Complaint updated."
  });
}

async function adminUsers(env) {
  const [{ results }, { results: vacantRooms }] = await Promise.all([
    env.DB.prepare(`
      SELECT u.id,u.full_name AS fullName,u.email,u.phone,u.role,u.status,u.must_change_password AS mustChangePassword,
             r.room_number AS roomNumber,o.id AS occupancyId
      FROM users u
      LEFT JOIN occupancies o ON o.user_id=u.id AND o.status='active'
      LEFT JOIN rooms r ON r.id=o.room_id
      WHERE u.deleted_at IS NULL
      ORDER BY CASE u.role WHEN 'admin' THEN 0 ELSE 1 END,u.full_name
    `).all(),
    env.DB.prepare("SELECT id,room_number AS roomNumber,floor,monthly_rate AS monthlyRate FROM rooms WHERE status='vacant' ORDER BY floor,room_number").all()
  ]);
  return json({
    users: (results || []).map(row => ({ ...row, mustChangePassword: Boolean(row.mustChangePassword) })),
    vacantRooms: vacantRooms || []
  });
}

async function createAdmin(request, env, admin) {
  const body = await readJson(request);
  const fullName = requireText(body.fullName, "Name", 120);
  const email = normalizeEmail(body.email);
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE AND deleted_at IS NULL").bind(email).first();
  if (existing) throw new HttpError(409,"That email is already in use");
  const tempPassword = temporaryPassword(env);
  const hash = await hashPassword(tempPassword);
  const result = await env.DB.prepare(`
    INSERT INTO users (full_name,email,password_hash,role,must_change_password,status) VALUES (?,?,?,'admin',1,'active')
  `).bind(fullName, email, hash).run();
  await audit(env.DB, admin.id, "create_admin", "user", result.meta?.last_row_id, { email });
  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}

async function createBoarder(request, env, admin) {
  const body = await readJson(request);
  const result = await createBoarderRecord(env,admin,body);
  return json({
    ok:true,
    id:result.id,
    occupancyId:result.occupancyId,
    welcomeSmsSent:Boolean(result.welcomeSmsSent),
    welcomeSmsAttempted:Boolean(result.welcomeSmsAttempted),
    message: result.welcomeSmsSent
      ? "Boarder created. Welcome SMS sent."
      : result.welcomeSmsAttempted
        ? "Boarder created, but the welcome SMS could not be sent. Check Semaphore configuration and the boarder's phone number."
        : "Boarder created. Welcome SMS will be sent once the boarder has a room and a valid phone number."
  },201);
}

async function createBoarderRecord(env, admin, body) {
  const fullName = requireText(body.fullName, "Name", 120);
  const email = body.email ? normalizeEmail(body.email) : null;
  const phone = body.phone ? normalizePhone(body.phone) : null;
  if (!email && !phone) throw new HttpError(400, "Boarder needs an email or phone number");
  const deposit = Number(body.deposit || 0);
  if (!Number.isFinite(deposit) || deposit < 0) throw new HttpError(400,"Deposit must be zero or greater");
  const occupants = Math.max(1,Math.min(20,Number(body.occupants)||1));
  const preferredFloor = ["First Floor","Second Floor","No Preference"].includes(body.preferredFloor) ? body.preferredFloor : cleanText(body.preferredFloor,40) || "No Preference";
  const roomId = body.roomId == null || body.roomId === "" ? null : Number(body.roomId);
  const dueDay = Math.max(1, Math.min(28, Number(body.dueDay) || 1));
  let room = null;
  if (roomId != null) {
    if (!Number.isInteger(roomId) || roomId <= 0) throw new HttpError(400,"Room is invalid");
    room = await env.DB.prepare("SELECT * FROM rooms WHERE id=? AND status='vacant'").bind(roomId).first();
    if (!room) throw new HttpError(409, "Selected room is not vacant");
  }
  if (email) {
    const existingEmail = await env.DB.prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE AND deleted_at IS NULL").bind(email).first();
    if (existingEmail) throw new HttpError(409,"That email is already in use");
  }
  if (phone) {
    const existingPhone = await env.DB.prepare("SELECT id FROM users WHERE phone=? AND deleted_at IS NULL").bind(phone).first();
    if (existingPhone) throw new HttpError(409,"That phone number is already in use");
  }
  const tempPassword = temporaryPassword(env);
  const hash = await hashPassword(tempPassword);
  const userInsert = await env.DB.prepare(`
    INSERT INTO users (full_name,email,phone,password_hash,role,must_change_password,status) VALUES (?,?,?,?, 'boarder',1,?)
  `).bind(fullName, email, phone, hash, room ? 'active' : 'inactive').run();
  const boarderId = userInsert.meta?.last_row_id;
  try {
    const statements = [];
    let occupancyIndex = -1;
    if (room) {
      occupancyIndex = statements.length;
      statements.push(env.DB.prepare("INSERT INTO occupancies (user_id,room_id,due_day,status) VALUES (?,?,?,'active')").bind(boarderId, roomId, dueDay));
    }
    statements.push(env.DB.prepare(`INSERT INTO boarder_profiles (user_id,applicant_id,facebook,occupation_school,preferred_move_in,preferred_floor,occupants,emergency_contact,deposit_amount,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(boarderId,body.applicantId||null,cleanText(body.facebook,300)||null,cleanText(body.occupationSchool,150)||null,cleanText(body.preferredMoveIn,20)||null,preferredFloor,occupants,cleanText(body.emergencyContact,150)||null,round2(deposit),cleanText(body.notes,1000)||null));
    if (room) statements.push(env.DB.prepare("UPDATE rooms SET status='occupied',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(roomId));
    if (body.applicantId) statements.push(env.DB.prepare("UPDATE applicants SET status='accepted',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(body.applicantId)));
    statements.push(env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"create_boarder","user",String(boarderId),JSON.stringify({ roomId:roomId||null, dueDay:room?dueDay:null, applicantId:body.applicantId||null })));
    const results = await env.DB.batch(statements);

    let welcomeSmsSent = false;
    let welcomeSmsAttempted = false;

    if (room && phone) {
      welcomeSmsAttempted = true;
      const welcome = await sendWelcomeSms(env, {
        boarderId,
        fullName,
        phone,
        email,
        roomNumber: room.room_number
      });
      welcomeSmsSent = welcome.sent;
    }

    return {
      id: boarderId,
      occupancyId: occupancyIndex>=0 ? results[occupancyIndex]?.meta?.last_row_id : null,
      welcomeSmsSent,
      welcomeSmsAttempted
    };
  } catch (error) {
    await env.DB.prepare("DELETE FROM users WHERE id=?").bind(boarderId).run();
    throw error;
  }
}

async function resetPassword(request, env, admin, userId) {
  const result = await performPasswordReset(env, admin, userId);
  return json(result);
}

async function resetPasswordRequestComplaint(env, admin, complaintId) {
  const complaint = await env.DB.prepare(`
    SELECT id,boarder_id AS boarderId,request_type AS requestType,status
    FROM complaints
    WHERE id=?
    LIMIT 1
  `).bind(complaintId).first();

  if (!complaint) throw new HttpError(404, "Password reset request not found");
  if (complaint.requestType !== "password_reset") throw new HttpError(400, "This complaint is not a password reset request");
  if (["resolved","closed"].includes(complaint.status)) throw new HttpError(409, "This password reset request is already resolved");

  const result = await performPasswordReset(env, admin, Number(complaint.boarderId), { complaintId });
  return json(result);
}

async function performPasswordReset(env, admin, userId, options = {}) {
  const target = await env.DB.prepare(
    "SELECT id,full_name AS fullName,email,phone,role FROM users WHERE id=? AND deleted_at IS NULL"
  ).bind(userId).first();

  if (!target) throw new HttpError(404, "User not found");

  const tempPassword = temporaryPassword(env);
  const hash = await hashPassword(tempPassword);
  const statements = [
    env.DB.prepare("UPDATE users SET password_hash=?,must_change_password=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(hash, userId),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
    env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"reset_password","user",String(userId),JSON.stringify({ role: target.role, email: target.email, complaintId: options.complaintId || null }))
  ];

  if (options.complaintId) {
    statements.push(
      env.DB.prepare("UPDATE complaints SET status='resolved',admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind("Password reset completed by admin.", options.complaintId)
    );
  }

  await env.DB.batch(statements);

  let smsSent = false;
  let smsMessage = "";

  if (target.role === "boarder" && target.phone) {
    const notification = await sendSmsLogged(env, {
      boarderId: target.id,
      phone: target.phone,
      notificationType: "password_reset",
      eventKey: `password-reset:${target.id}:${crypto.randomUUID()}`,
      message: `Casa Vicenta: Your account password was reset by the admin. Use the temporary password ${tempPassword} to log in, then change your password immediately.`
    });

    smsSent = notification.sent;
    smsMessage = notification.sent
      ? " SMS notification sent to the boarder."
      : " Password was reset, but the SMS notification could not be sent. Check the SMS provider configuration and the boarder's phone number.";
  }

  return {
    ok: true,
    smsSent,
    message: `Password reset to the configured temporary password.${smsMessage}`
  };
}

async function endOccupancy(env, admin, occupancyId) {
  const row = await env.DB.prepare("SELECT * FROM occupancies WHERE id=? AND status='active'").bind(occupancyId).first();
  if (!row) throw new HttpError(404, "Active occupancy not found");
  await env.DB.batch([
    env.DB.prepare("UPDATE occupancies SET status='ended',ended_at=date('now') WHERE id=?").bind(occupancyId),
    env.DB.prepare("UPDATE rooms SET status='vacant',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.room_id),
    env.DB.prepare("UPDATE users SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.user_id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id),
    env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"end_occupancy","occupancy",String(occupancyId),JSON.stringify({ roomId: row.room_id, userId: row.user_id }))
  ]);
  return json({ ok: true });
}

async function saveElectricity(request, env, admin) {
  const body = await readJson(request);
  const roomId = Number(body.roomId);
  const billingPeriod = requireText(body.billingPeriod, "Billing month", 7);
  if (!/^\d{4}-\d{2}$/.test(billingPeriod)) throw new HttpError(400, "Billing month must use YYYY-MM format");
  const previous = Number(body.previousReading);
  const current = Number(body.currentReading);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || current < previous) throw new HttpError(400, "Meter readings are invalid");

  const occupancy = await env.DB.prepare(`
    SELECT
      o.id AS occupancy_id,
      o.user_id,
      o.due_day,
      r.monthly_rate,
      r.room_number,
      u.full_name AS boarder_name,
      u.phone AS boarder_phone
    FROM occupancies o
    JOIN rooms r ON r.id=o.room_id
    JOIN users u ON u.id=o.user_id
    WHERE o.room_id=? AND o.status='active'
    LIMIT 1
  `).bind(roomId).first();
  if (!occupancy) throw new HttpError(404, "No active boarder in this room");

  const existingBill = await env.DB.prepare("SELECT id,status FROM billing_cycles WHERE boarder_id=? AND billing_period=?")
    .bind(occupancy.user_id, billingPeriod).first();
  if (existingBill?.status === "paid") throw new HttpError(409, "This billing period is already paid and cannot be recalculated");
  if (existingBill?.id) {
    const pendingReceipt = await env.DB.prepare("SELECT id FROM payment_submissions WHERE billing_id=? AND status='pending' LIMIT 1").bind(existingBill.id).first();
    if (pendingReceipt) throw new HttpError(409,"This bill has a pending receipt and cannot be recalculated until it is approved or rejected");
    const payment = await env.DB.prepare("SELECT id FROM payments WHERE billing_id=? LIMIT 1").bind(existingBill.id).first();
    if (payment) throw new HttpError(409,"This bill has approved payments and cannot be recalculated");
  }

  const settings = await getSettings(env.DB);
  const rate = Number(settings.electricity_rate || 0);
  if (!(rate >= 0)) throw new HttpError(400, "Electricity rate is invalid");
  const consumption = round2(current - previous);
  const amount = round2(consumption * rate);
  const roomRent = Number(occupancy.monthly_rate);
  const waterAmount = Number(settings.water_monthly_amount || 0);
  const total = round2(roomRent + amount + waterAmount);
  const rentDueDate = billingDueDate(billingPeriod, occupancy.due_day);
  const electricityDueDate = billingDueDate(billingPeriod, settings.electricity_due_day);
  const waterDueDate = billingDueDate(billingPeriod, settings.water_due_day);
  const dueDate = rentDueDate;

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO electricity_readings (room_id,boarder_id,billing_period,previous_reading,current_reading,consumption,rate,amount,created_by)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(room_id,billing_period) DO UPDATE SET previous_reading=excluded.previous_reading,current_reading=excluded.current_reading,
      consumption=excluded.consumption,rate=excluded.rate,amount=excluded.amount,created_by=excluded.created_by,created_at=CURRENT_TIMESTAMP
    `).bind(roomId, occupancy.user_id, billingPeriod, previous, current, consumption, rate, amount, admin.id),
    env.DB.prepare(`
      INSERT INTO billing_cycles (occupancy_id,room_id,boarder_id,billing_period,due_date,electricity_due_date,water_due_date,room_rent,electricity_amount,electricity_consumption,electricity_rate,water_amount,total_amount,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'unpaid')
      ON CONFLICT(boarder_id,billing_period) DO UPDATE SET occupancy_id=excluded.occupancy_id,room_id=excluded.room_id,due_date=excluded.due_date,
      electricity_due_date=excluded.electricity_due_date,water_due_date=excluded.water_due_date,
      room_rent=excluded.room_rent,electricity_amount=excluded.electricity_amount,electricity_consumption=excluded.electricity_consumption,
      electricity_rate=excluded.electricity_rate,water_amount=excluded.water_amount,total_amount=excluded.total_amount,updated_at=CURRENT_TIMESTAMP
    `).bind(occupancy.occupancy_id, roomId, occupancy.user_id, billingPeriod, dueDate, electricityDueDate, waterDueDate, roomRent, amount, consumption, rate, waterAmount,total),
    env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(admin.id,"save_electricity","room",String(roomId),JSON.stringify({ billingPeriod, previous, current, rate, amount }))
  ]);

  let electricitySmsSent = false;
  let electricitySmsAttempted = false;

  if (occupancy.boarder_phone) {
    electricitySmsAttempted = true;
    const message =
      `Casa Vicenta electricity bill for ${smsMonthLabel(billingPeriod)}: ` +
      `Previous reading ${formatNumberForSms(previous)} kWh; ` +
      `current reading ${formatNumberForSms(current)} kWh; ` +
      `usage ${formatNumberForSms(consumption)} kWh x ${formatPesoForSms(rate)}/kWh = ${formatPesoForSms(amount)}. ` +
      `Due ${smsDateLabel(electricityDueDate)}.`;

    const notification = await sendSmsLogged(env, {
      boarderId: Number(occupancy.user_id),
      phone: occupancy.boarder_phone,
      notificationType: "electricity_bill",
      eventKey: `electricity-bill:${occupancy.user_id}:${billingPeriod}:${current}:${amount}`,
      message
    });

    electricitySmsSent = notification.sent;
  }

  return json({
    ok: true,
    consumption,
    amount,
    roomRent,
    waterAmount,
    total,
    currentReading: current,
    dueDate,
    rentDueDate,
    electricityDueDate,
    waterDueDate,
    electricitySmsSent,
    electricitySmsAttempted,
    message: electricitySmsSent
      ? "Monthly bill saved. Electricity bill SMS sent."
      : electricitySmsAttempted
        ? "Monthly bill saved, but the electricity SMS could not be sent. Check Semaphore configuration and the boarder's phone number."
        : "Monthly bill saved. The boarder has no phone number for SMS."
  });
}


async function roomHistory(env) {
  const now = new Date();
  const end = manilaDate(now).slice(0,7);
  const [year,month] = end.split("-").map(Number);
  const start = monthKey(new Date(Date.UTC(year,month-6,1)));
  const {results} = await env.DB.prepare(`SELECT e.room_id AS roomId,r.room_number AS roomNumber,e.billing_period AS period,
    e.previous_reading AS previousReading,e.current_reading AS currentReading,e.consumption,e.rate,e.amount,
    u.full_name AS boarder FROM electricity_readings e JOIN rooms r ON r.id=e.room_id JOIN users u ON u.id=e.boarder_id
    WHERE e.billing_period BETWEEN ? AND ? ORDER BY r.room_number,e.billing_period DESC`).bind(start,end).all();
  return json({start,end,readings:results||[]});
}

async function updateWater(request,env,admin) {
  const body=await readJson(request);
  const amount=Number(body.monthlyAmount);
  if (!Number.isFinite(amount) || amount<0) throw new HttpError(400,"Water amount must be zero or more");
  const value=String(round2(amount));
  await env.DB.prepare(`INSERT INTO settings (key,value,updated_by,updated_at) VALUES ('water_monthly_amount',?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(value,admin.id).run();
  await audit(env.DB,admin.id,"update_water","settings","water_monthly_amount",{amount});
  return json({ok:true,monthlyAmount:Number(value)});
}

async function adminBoarders(env) {
  const {results}=await env.DB.prepare(`
    WITH payment_totals AS (
      SELECT billing_id,
        SUM(CASE WHEN payment_type='rent' THEN amount ELSE 0 END) AS rentPaid,
        SUM(CASE WHEN payment_type='electricity' THEN amount ELSE 0 END) AS electricityPaid,
        SUM(CASE WHEN payment_type='water' THEN amount ELSE 0 END) AS waterPaid
      FROM payments GROUP BY billing_id
    ),
    boarder_balances AS (
      SELECT b.boarder_id AS boarderId,
        SUM(CASE WHEN b.status='paid' THEN 0 ELSE MAX(0,b.room_rent-COALESCE(pt.rentPaid,0)) END) AS rentBalance,
        SUM(CASE WHEN b.status='paid' THEN 0 ELSE MAX(0,b.electricity_amount-COALESCE(pt.electricityPaid,0)) END) AS electricityBalance,
        SUM(CASE WHEN b.status='paid' THEN 0 ELSE MAX(0,b.water_amount-COALESCE(pt.waterPaid,0)) END) AS waterBalance
      FROM billing_cycles b
      LEFT JOIN payment_totals pt ON pt.billing_id=b.id
      WHERE b.status!='void'
      GROUP BY b.boarder_id
    )
    SELECT u.id,u.full_name AS fullName,u.email,u.phone,u.status,u.must_change_password AS mustChangePassword,u.created_at AS createdAt,
      p.facebook,p.occupation_school AS occupationSchool,p.preferred_move_in AS preferredMoveIn,p.preferred_floor AS preferredFloor,p.occupants,
      p.emergency_contact AS emergencyContact,p.deposit_amount AS deposit,p.notes,p.applicant_id AS applicantId,
      o.id AS occupancyId,o.due_day AS dueDay,o.started_at AS startedAt,r.id AS roomId,r.room_number AS roomNumber,r.floor,r.monthly_rate AS monthlyRate,
      COALESCE(bb.rentBalance,0) AS rentBalance,COALESCE(bb.electricityBalance,0) AS electricityBalance,COALESCE(bb.waterBalance,0) AS waterBalance
    FROM users u
    LEFT JOIN boarder_profiles p ON p.user_id=u.id
    LEFT JOIN occupancies o ON o.user_id=u.id AND o.status='active'
    LEFT JOIN rooms r ON r.id=o.room_id
    LEFT JOIN boarder_balances bb ON bb.boarderId=u.id
    WHERE u.role='boarder' AND u.deleted_at IS NULL
    ORDER BY CASE WHEN o.id IS NULL THEN 1 ELSE 0 END,r.floor,r.room_number,u.full_name
  `).all();
  const {results:vacantRooms}=await env.DB.prepare(`
    SELECT id,room_number AS roomNumber,floor FROM rooms WHERE status='vacant' ORDER BY floor,room_number
  `).all();
  return json({
    boarders:(results||[]).map(row=>{
      const rentBalance=round2(Number(row.rentBalance||0));
      const electricityBalance=round2(Number(row.electricityBalance||0));
      const waterBalance=round2(Number(row.waterBalance||0));
      return {...row,deposit:round2(Number(row.deposit||0)),rentBalance,electricityBalance,waterBalance,remainingBalance:round2(rentBalance+electricityBalance+waterBalance),mustChangePassword:Boolean(row.mustChangePassword)};
    }),
    vacantRooms:vacantRooms||[]
  });
}

async function boarderProfile(env,userId) {
  const row=await env.DB.prepare(`SELECT u.id,u.full_name AS fullName,u.email,u.phone,u.status,p.facebook,
    p.occupation_school AS occupationSchool,p.preferred_move_in AS preferredMoveIn,
    p.preferred_floor AS preferredFloor,p.occupants,p.emergency_contact AS emergencyContact,p.deposit_amount AS deposit,p.notes,p.applicant_id AS applicantId,
    o.due_day AS dueDay,r.room_number AS roomNumber
    FROM users u LEFT JOIN boarder_profiles p ON p.user_id=u.id
    LEFT JOIN occupancies o ON o.user_id=u.id AND o.status='active'
    LEFT JOIN rooms r ON r.id=o.room_id WHERE u.id=? AND u.role='boarder' AND u.deleted_at IS NULL`).bind(userId).first();
  if (!row) throw new HttpError(404,"Boarder not found");
  const {results:promises}=await env.DB.prepare(`SELECT note,promised_date AS promisedDate,created_at AS createdAt
    FROM payment_promises WHERE boarder_id=? ORDER BY created_at DESC LIMIT 30`).bind(userId).all();
  return json({profile:row,promises:promises||[]});
}

async function updateBoarderProfile(request,env,admin,userId) {
  const body=await readJson(request);
  const target=await env.DB.prepare("SELECT id,email,phone FROM users WHERE id=? AND role='boarder' AND deleted_at IS NULL").bind(userId).first();
  if (!target) throw new HttpError(404,"Boarder not found");
  const fullName=requireText(body.fullName,"Name",120);
  const phone=body.phone?normalizePhone(body.phone):target.phone;
  const occupants=Number(body.occupants||1);
  if (!Number.isInteger(occupants)||occupants<1||occupants>20) throw new HttpError(400,"Occupants must be 1–20");
  const occupancy=await env.DB.prepare("SELECT id,due_day FROM occupancies WHERE user_id=? AND status='active' LIMIT 1").bind(userId).first();
  const dueDay=body.dueDay==null||body.dueDay===""?Number(occupancy?.due_day||1):Number(body.dueDay);
  if (occupancy&&(!Number.isInteger(dueDay)||dueDay<1||dueDay>28)) throw new HttpError(400,"Due day must be 1–28");
  const deposit=body.deposit==null||body.deposit===""?0:Number(body.deposit);
  if (!Number.isFinite(deposit)||deposit<0) throw new HttpError(400,"Deposit must be zero or greater");
  const statements=[
    env.DB.prepare("UPDATE users SET full_name=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(fullName,phone,userId),
    env.DB.prepare(`INSERT INTO boarder_profiles (user_id,facebook,occupation_school,preferred_move_in,preferred_floor,occupants,emergency_contact,deposit_amount,notes)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET facebook=excluded.facebook,
      occupation_school=excluded.occupation_school,preferred_move_in=excluded.preferred_move_in,preferred_floor=excluded.preferred_floor,
      occupants=excluded.occupants,emergency_contact=excluded.emergency_contact,deposit_amount=excluded.deposit_amount,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`)
      .bind(userId,cleanText(body.facebook,300),cleanText(body.occupationSchool,150),cleanText(body.preferredMoveIn,20),cleanText(body.preferredFloor,40),occupants,cleanText(body.emergencyContact,150),round2(deposit),cleanText(body.notes,1000))
  ];
  if (occupancy) statements.push(env.DB.prepare("UPDATE occupancies SET due_day=? WHERE id=?").bind(dueDay,occupancy.id));
  await env.DB.batch(statements);
  await audit(env.DB,admin.id,"update_boarder","user",userId);
  return json({ok:true});
}

async function deleteBoarder(env,admin,userId) {
  const target=await env.DB.prepare("SELECT id,full_name,email,phone FROM users WHERE id=? AND role='boarder' AND deleted_at IS NULL").bind(userId).first();
  if (!target) throw new HttpError(404,"Boarder not found");
  const occupancy=await env.DB.prepare("SELECT id,room_id FROM occupancies WHERE user_id=? AND status='active' LIMIT 1").bind(userId).first();
  const statements=[];
  if (occupancy) {
    statements.push(env.DB.prepare("UPDATE occupancies SET status='ended',ended_at=date('now') WHERE id=?").bind(occupancy.id));
    statements.push(env.DB.prepare("UPDATE rooms SET status='vacant',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(occupancy.room_id));
  }
  statements.push(env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId));
  statements.push(env.DB.prepare("UPDATE users SET email=NULL,phone=NULL,status='inactive',deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(userId));
  statements.push(env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
    .bind(admin.id,"delete_boarder","user",String(userId),JSON.stringify({roomId:occupancy?.room_id||null,name:target.full_name})));
  await env.DB.batch(statements);
  return json({ok:true});
}

async function createPaymentPromise(request,env,admin) {
  const body=await readJson(request);
  const boarderId=Number(body.boarderId);
  const note=requireText(body.note,"Promise note",1000);
  const promisedDate=cleanText(body.promisedDate,20)||null;
  const target=await env.DB.prepare("SELECT id FROM users WHERE id=? AND role='boarder' AND deleted_at IS NULL").bind(boarderId).first();
  if (!target) throw new HttpError(404,"Boarder not found");
  const result=await env.DB.prepare("INSERT INTO payment_promises (boarder_id,note,promised_date,created_by) VALUES (?,?,?,?)")
    .bind(boarderId,note,promisedDate,admin.id).run();
  await audit(env.DB,admin.id,"payment_promise","user",boarderId,{promisedDate});
  return json({ok:true,id:result.meta?.last_row_id});
}

async function getSettings(db) {
  const { results } = await db.prepare("SELECT key,value FROM settings").all();
  return Object.fromEntries((results || []).map(row => [row.key, row.value]));
}

async function updateSettings(request, env, admin) {
  const body = await readJson(request);
  const allowed = ["electricity_rate","electricity_due_day","water_due_day","water_monthly_amount","bank_name","bank_account_name","bank_account_number","landlady_name","landlady_email","landlady_phone"];
  const statements = [];
  const changed = {};
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    const value = cleanText(body[key], 500);
    if (key === "electricity_rate" && !(Number(value) >= 0)) throw new HttpError(400, "Electricity rate is invalid");
    if (key === "water_monthly_amount" && !(Number(value) >= 0)) throw new HttpError(400, "Water amount is invalid");
    if (["electricity_due_day","water_due_day"].includes(key)) {
      const day = Number(value);
      if (!Number.isInteger(day) || day < 1 || day > 28) throw new HttpError(400, "Utility due day must be between 1 and 28");
    }
    statements.push(env.DB.prepare(`
      INSERT INTO settings (key,value,updated_by,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP
    `).bind(key, value, admin.id));
    changed[key] = value;
  }
  if (!statements.length) throw new HttpError(400, "No supported settings supplied");
  statements.push(env.DB.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
    .bind(admin.id,"update_settings","settings","global",JSON.stringify({ keys: Object.keys(changed) })));
  await env.DB.batch(statements);
  return json({ ok: true, settings: await getSettings(env.DB) });
}

async function cleanupQueuedReceipts(env) {
  const { results } = await env.DB.prepare("SELECT id,r2_key,attempts FROM receipt_cleanup_queue ORDER BY created_at LIMIT 50").all();
  for (const item of results || []) {
    try {
      await env.RECEIPTS.delete(item.r2_key);
      await env.DB.prepare("DELETE FROM receipt_cleanup_queue WHERE id=?").bind(item.id).run();
    } catch (error) {
      await env.DB.prepare("UPDATE receipt_cleanup_queue SET attempts=attempts+1,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(String(error?.message || error).slice(0,500), item.id).run();
    }
  }
}

async function sendDueDateSmsReminders(env) {
  const settings = await getSettings(env.DB);
  const today = manilaDate(new Date());
  const threeDaysFromNow = addDaysToDate(today, 3);

  const { results } = await env.DB.prepare(`
    SELECT
      b.id,
      b.boarder_id AS boarderId,
      b.billing_period AS period,
      b.due_date AS rentDueDate,
      b.electricity_due_date AS storedElectricityDueDate,
      b.water_due_date AS storedWaterDueDate,
      b.room_rent AS rent,
      b.electricity_amount AS electricity,
      b.water_amount AS water,
      u.full_name AS boarder,
      u.phone,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
      COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
    FROM billing_cycles b
    JOIN users u ON u.id=b.boarder_id
    WHERE b.status='unpaid'
      AND u.role='boarder'
      AND u.status='active'
      AND u.deleted_at IS NULL
      AND u.phone IS NOT NULL
      AND trim(u.phone)!=''
  `).all();

  const groups = new Map();

  for (const bill of results || []) {
    const charges = [
      {
        type: "Rent",
        dueDate: bill.rentDueDate,
        amount: Math.max(0, Number(bill.rent || 0) - Number(bill.rentPaid || 0) - Number(bill.rentPending || 0))
      },
      {
        type: "Electricity",
        dueDate: bill.storedElectricityDueDate || billingDueDate(bill.period, settings.electricity_due_day),
        amount: Math.max(0, Number(bill.electricity || 0) - Number(bill.electricityPaid || 0) - Number(bill.electricityPending || 0))
      },
      {
        type: "Water",
        dueDate: bill.storedWaterDueDate || billingDueDate(bill.period, settings.water_due_day),
        amount: Math.max(0, Number(bill.water || 0) - Number(bill.waterPaid || 0) - Number(bill.waterPending || 0))
      }
    ];

    for (const charge of charges) {
      if (charge.amount <= 0.001) continue;
      if (![today, threeDaysFromNow].includes(charge.dueDate)) continue;

      const daysBefore = charge.dueDate === today ? 0 : 3;
      const key = `${bill.boarderId}:${charge.dueDate}:${daysBefore}`;
      const current = groups.get(key) || {
        boarderId: Number(bill.boarderId),
        boarder: bill.boarder,
        phone: bill.phone,
        dueDate: charge.dueDate,
        daysBefore,
        amounts: { Rent: 0, Electricity: 0, Water: 0 }
      };

      current.amounts[charge.type] = round2(current.amounts[charge.type] + Number(charge.amount || 0));
      groups.set(key, current);
    }
  }

  for (const reminder of groups.values()) {
    const lines = Object.entries(reminder.amounts)
      .filter(([,amount]) => amount > 0.001)
      .map(([type,amount]) => `${type} ${formatPesoForSms(amount)}`);

    const total = round2(Object.values(reminder.amounts).reduce((sum, amount) => sum + Number(amount || 0), 0));
    const timing = reminder.daysBefore === 0
      ? `Due today (${smsDateLabel(reminder.dueDate)})`
      : `Due in 3 days on ${smsDateLabel(reminder.dueDate)}`;

    const message =
      `Casa Vicenta payment reminder: ${timing}. ` +
      `Total ${formatPesoForSms(total)}. ${lines.join("; ")}. ` +
      `If you need more time, log in to your Casa Vicenta account and submit the date you can pay.`;

    await sendSmsLogged(env, {
      boarderId: reminder.boarderId,
      phone: reminder.phone,
      notificationType: reminder.daysBefore === 0 ? "due_today" : "due_in_3_days",
      eventKey: `billing-reminder:${reminder.boarderId}:${reminder.dueDate}:${reminder.daysBefore}`,
      message
    });
  }
}

async function sendPaymentPromiseSmsReminders(env) {
  const settings = await getSettings(env.DB);
  const today = manilaDate(new Date());
  const threeDaysFromNow = addDaysToDate(today, 3);

  const { results: promises } = await env.DB.prepare(`
    SELECT
      pp.id,
      pp.boarder_id AS boarderId,
      pp.promised_date AS promisedDate,
      u.full_name AS boarder,
      u.phone
    FROM payment_promises pp
    JOIN users u ON u.id=pp.boarder_id
    WHERE pp.created_by=pp.boarder_id
      AND pp.promised_date IS NOT NULL
      AND pp.promised_date IN (?,?)
      AND u.role='boarder'
      AND u.status='active'
      AND u.deleted_at IS NULL
      AND u.phone IS NOT NULL
      AND trim(u.phone)!=''
      AND pp.id=(
        SELECT p2.id
        FROM payment_promises p2
        WHERE p2.boarder_id=pp.boarder_id
          AND p2.created_by=p2.boarder_id
          AND p2.promised_date IS NOT NULL
        ORDER BY p2.id DESC
        LIMIT 1
      )
  `).bind(today, threeDaysFromNow).all();

  for (const promise of promises || []) {
    const { results: bills } = await env.DB.prepare(`
      SELECT
        b.id,
        b.billing_period AS period,
        b.due_date AS rentDueDate,
        b.electricity_due_date AS storedElectricityDueDate,
        b.water_due_date AS storedWaterDueDate,
        b.room_rent AS rent,
        b.electricity_amount AS electricity,
        b.water_amount AS water,
        b.status,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='rent'),0) AS rentPaid,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='electricity'),0) AS electricityPaid,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.billing_id=b.id AND p.payment_type='water'),0) AS waterPaid,
        COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='rent' AND x.status='pending'),0) AS rentPending,
        COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='electricity' AND x.status='pending'),0) AS electricityPending,
        COALESCE((SELECT SUM(x.declared_amount) FROM payment_submissions x WHERE x.billing_id=b.id AND x.payment_type='water' AND x.status='pending'),0) AS waterPending
      FROM billing_cycles b
      WHERE b.boarder_id=?
        AND b.status!='void'
    `).bind(promise.boarderId).all();

    const amounts = { Rent: 0, Electricity: 0, Water: 0 };

    for (const bill of bills || []) {
      if (bill.status === 'paid') continue;

      const charges = [
        {
          type: 'Rent',
          dueDate: bill.rentDueDate,
          amount: Math.max(0, Number(bill.rent || 0) - Number(bill.rentPaid || 0) - Number(bill.rentPending || 0))
        },
        {
          type: 'Electricity',
          dueDate: bill.storedElectricityDueDate || billingDueDate(bill.period, settings.electricity_due_day),
          amount: Math.max(0, Number(bill.electricity || 0) - Number(bill.electricityPaid || 0) - Number(bill.electricityPending || 0))
        },
        {
          type: 'Water',
          dueDate: bill.storedWaterDueDate || billingDueDate(bill.period, settings.water_due_day),
          amount: Math.max(0, Number(bill.water || 0) - Number(bill.waterPaid || 0) - Number(bill.waterPending || 0))
        }
      ];

      for (const charge of charges) {
        if (charge.amount > 0.001 && charge.dueDate && charge.dueDate < today) {
          amounts[charge.type] = round2(amounts[charge.type] + charge.amount);
        }
      }
    }

    const total = round2(Object.values(amounts).reduce((sum, amount) => sum + Number(amount || 0), 0));
    if (total <= 0.001) continue;

    const lines = Object.entries(amounts)
      .filter(([,amount]) => amount > 0.001)
      .map(([type,amount]) => `${type} ${formatPesoForSms(amount)}`);

    const daysBefore = promise.promisedDate === today ? 0 : 3;
    const timing = daysBefore === 0
      ? `Your promised payment date is today (${smsDateLabel(promise.promisedDate)})`
      : `Your promised payment date is in 3 days on ${smsDateLabel(promise.promisedDate)}`;

    const message =
      `Casa Vicenta payment promise reminder: ${timing}. ` +
      `Current overdue total ${formatPesoForSms(total)}. ${lines.join("; ")}. ` +
      `If you need to change your payment date, log in to your Casa Vicenta account.`;

    await sendSmsLogged(env, {
      boarderId: Number(promise.boarderId),
      phone: promise.phone,
      notificationType: daysBefore === 0 ? 'promise_due_today' : 'promise_due_in_3_days',
      eventKey: `promise-reminder:${promise.id}:${daysBefore}`,
      message
    });
  }
}

async function sendViewingScheduleSmsReminders(env) {
  const today = manilaDate(new Date());
  const threeDaysFromNow = addDaysToDate(today, 3);

  const { results } = await env.DB.prepare(`
    SELECT
      v.id AS scheduleId,
      v.applicant_id AS applicantId,
      v.scheduled_at AS scheduledAt,
      a.full_name AS applicant,
      a.phone
    FROM viewing_schedules v
    JOIN applicants a ON a.id=v.applicant_id
    WHERE a.status='scheduled'
      AND v.cancelled_at IS NULL
      AND a.phone IS NOT NULL
      AND trim(a.phone)!=''
      AND substr(v.scheduled_at,1,10) IN (?,?)
      AND v.id=(
        SELECT v2.id
        FROM viewing_schedules v2
        WHERE v2.applicant_id=v.applicant_id
          AND v2.cancelled_at IS NULL
        ORDER BY v2.id DESC
        LIMIT 1
      )
  `).bind(today, threeDaysFromNow).all();

  for (const viewing of results || []) {
    const viewingDate = String(viewing.scheduledAt || "").slice(0,10);
    const daysBefore = viewingDate === today ? 0 : 3;
    const timing = daysBefore === 0
      ? `Your scheduled viewing is today at ${smsTimeLabel(viewing.scheduledAt)}`
      : `Your scheduled viewing is in 3 days on ${smsDateTimeLabel(viewing.scheduledAt)}`;

    const contact = applicantContactLinkText(env, "Need to reschedule or send us a message");
    const message =
      `Casa Vicenta viewing reminder: ${timing}. ` +
      `We look forward to seeing you. ${contact}`;

    await sendSmsLogged(env, {
      boarderId: null,
      phone: viewing.phone,
      notificationType: daysBefore === 0 ? "viewing_due_today" : "viewing_in_3_days",
      eventKey: `viewing-reminder:${viewing.scheduleId}:${daysBefore}`,
      message
    });
  }
}


function applicantRequestTypeLabel(value) {
  return {
    reschedule: "viewing reschedule request",
    question: "question",
    cancel: "viewing cancellation request"
  }[value] || "applicant request";
}

function applicantContactUrl(env) {
  const base = cleanText(env.PUBLIC_SITE_URL, 500).replace(/\/+$/, "");
  return base ? `${base}/applicant-request` : "";
}

function applicantContactLinkText(env, prefix = "Contact Casa Vicenta") {
  const url = applicantContactUrl(env);
  return url
    ? `${prefix}: ${url}`
    : `${prefix}: use the Applicant Contact / Reschedule form on the Casa Vicenta website.`;
}

async function sendWelcomeSms(env, { boarderId, fullName, phone, email, roomNumber }) {
  const login = phone || email || '';
  const tempPassword = temporaryPassword(env);
  const roomText = roomNumber ? ` for Room ${roomNumber}` : '';
  const message =
    `Casa Vicenta: Welcome, ${cleanText(fullName, 80)}! Your boarder account is ready${roomText}. ` +
    `Login: ${login}. Temporary password: ${tempPassword}. ` +
    `Please log in and change your password.`;

  return sendSmsLogged(env, {
    boarderId: Number(boarderId),
    phone,
    notificationType: 'welcome_boarder',
    eventKey: `welcome-boarder:${boarderId}`,
    message
  });
}

async function sendSmsLogged(env, { boarderId, phone, notificationType, eventKey, message }) {
  const existing = await env.DB.prepare(
    "SELECT status,provider_message_id AS providerMessageId FROM sms_notifications WHERE event_key=? LIMIT 1"
  ).bind(eventKey).first();

  if (existing?.status === "sent") {
    return { sent: true, duplicate: true, providerMessageId: existing.providerMessageId || null };
  }

  const to = normalizeSmsPhone(phone);

  await env.DB.prepare(`
    INSERT INTO sms_notifications
      (boarder_id,notification_type,event_key,phone,message,status,updated_at)
    VALUES (?,?,?,?,?,'pending',CURRENT_TIMESTAMP)
    ON CONFLICT(event_key) DO UPDATE SET
      boarder_id=excluded.boarder_id,
      notification_type=excluded.notification_type,
      phone=excluded.phone,
      message=excluded.message,
      status='pending',
      last_error=NULL,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    boarderId || null,
    notificationType,
    eventKey,
    to || cleanText(phone, 40),
    message
  ).run();

  if (!to) {
    await env.DB.prepare(`
      UPDATE sms_notifications
      SET status='failed',last_error=?,updated_at=CURRENT_TIMESTAMP
      WHERE event_key=?
    `).bind("Invalid or unsupported phone number", eventKey).run();

    return { sent: false, error: "Invalid or unsupported phone number" };
  }

  try {
    const providerMessageId = await sendSmsViaSemaphore(env, to, message);

    await env.DB.prepare(`
      UPDATE sms_notifications
      SET status='sent',provider_message_id=?,last_error=NULL,sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE event_key=?
    `).bind(providerMessageId || null, eventKey).run();

    return { sent: true, providerMessageId: providerMessageId || null };
  } catch (error) {
    const detail = String(error?.message || error).slice(0, 500);

    await env.DB.prepare(`
      UPDATE sms_notifications
      SET status='failed',last_error=?,updated_at=CURRENT_TIMESTAMP
      WHERE event_key=?
    `).bind(detail, eventKey).run();

    console.error("SMS send failed", { eventKey, error: detail });
    return { sent: false, error: detail };
  }
}

async function sendSmsViaSemaphore(env, to, message) {
  const apiKey = cleanText(env.SEMAPHORE_API_KEY, 300);
  const senderName = cleanText(env.SEMAPHORE_SENDER_NAME || env.SEMAPHORE_SENDERNAME, 30);

  if (!apiKey) {
    throw new Error("Semaphore SMS service is not configured. Add SEMAPHORE_API_KEY.");
  }

  const form = new URLSearchParams();
  form.set("apikey", apiKey);
  form.set("number", semaphorePhoneNumber(to));
  form.set("message", message);
  if (senderName) form.set("sendername", senderName);

  const response = await fetch(
    "https://api.semaphore.co/api/v4/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    }
  );

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.message ||
      payload?.error ||
      `Semaphore returned ${response.status}`;
    throw new Error(detail);
  }

  const first = Array.isArray(payload) ? payload[0] : payload;

  if (!first) {
    throw new Error("Semaphore returned an empty response");
  }

  const providerStatus = String(first.status || "").toLowerCase();
  if (["failed", "refunded"].includes(providerStatus)) {
    throw new Error(`Semaphore message status: ${first.status}`);
  }

  return first.message_id != null ? String(first.message_id) : null;
}

function semaphorePhoneNumber(value) {
  const normalized = normalizeSmsPhone(value);
  if (!normalized) return cleanText(value, 40);

  if (/^\+639\d{9}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }

  return normalized.replace(/^\+/, "");
}

function phoneLookupCandidates(value) {
  const raw = cleanText(value, 40).replace(/[\s()-]/g, "");
  const candidates = [];
  const add = value => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };

  add(raw);

  if (/^09\d{9}$/.test(raw)) {
    add(`+63${raw.slice(1)}`);
    add(`63${raw.slice(1)}`);
  } else if (/^\+639\d{9}$/.test(raw)) {
    add(`0${raw.slice(3)}`);
    add(raw.slice(1));
  } else if (/^639\d{9}$/.test(raw)) {
    add(`+${raw}`);
    add(`0${raw.slice(2)}`);
  } else if (/^9\d{9}$/.test(raw)) {
    add(`0${raw}`);
    add(`+63${raw}`);
  }

  while (candidates.length < 3) candidates.push("");
  return candidates.slice(0, 3);
}

function normalizeSmsPhone(value) {
  const raw = cleanText(value, 40).replace(/[^\d+]/g, "");

  if (/^\+\d{8,15}$/.test(raw)) return raw;
  if (/^09\d{9}$/.test(raw)) return `+63${raw.slice(1)}`;
  if (/^639\d{9}$/.test(raw)) return `+${raw}`;
  if (/^9\d{9}$/.test(raw)) return `+63${raw}`;

  return null;
}

function addDaysToDate(dateString, days) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function smsDateLabel(dateString) {
  if (!dateString) return "the due date";
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function smsDateTimeLabel(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return cleanText(value, 40) || "the scheduled time";

  const [,year,month,day,hour,minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month)-1, Number(day), Number(hour), Number(minute)));

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
  }).format(date);
}

function smsTimeLabel(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return "your scheduled time";

  const [,year,month,day,hour,minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month)-1, Number(day), Number(hour), Number(minute)));

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
  }).format(date);
}

function titleCaseSms(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function smsMonthLabel(period) {
  if (!/^\d{4}-\d{2}$/.test(String(period || ""))) return String(period || "");
  const [year, month] = String(period).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Manila"
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function formatNumberForSms(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPesoForSms(value) {
  return `PHP ${formatNumberForSms(value)}`;
}

async function audit(db, adminId, action, entityType, entityId, details = {}) {
  await db.prepare("INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
    .bind(adminId, action, entityType, String(entityId ?? ""), JSON.stringify(details)).run();
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(token, maxAge, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`;
}

function randomToken(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return base64Url(arr);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Number(parts[1]);
  const salt = base64UrlDecode(parts[2]);
  const expected = base64UrlDecode(parts[3]);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, expected.length * 8);
  return constantTimeEqual(new Uint8Array(bits), expected);
}

async function sha256Hex(text) {
  return sha256HexBytes(encoder.encode(text));
}

async function sha256HexBytes(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function safeEqual(a, b) {
  const x = encoder.encode(String(a));
  const y = encoder.encode(String(b));
  return constantTimeEqual(x, y);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthKey(date) {
  return manilaDate(date).slice(0, 7);
}

function manilaDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function billingDueDate(period, dueDay) {
  const day = Math.max(1, Math.min(28, Number(dueDay) || 1));
  return `${period}-${String(day).padStart(2,"0")}`;
}

function nextDueDate(dueDay) {
  const now = new Date();
  const today = manilaDate(now);
  const [year, month, day] = today.split("-").map(Number);
  let y = year, m = month;
  if (day > dueDay) {
    m += 1;
    if (m === 13) { m = 1; y += 1; }
  }
  return `${y}-${String(m).padStart(2,"0")}-${String(dueDay).padStart(2,"0")}`;
}
