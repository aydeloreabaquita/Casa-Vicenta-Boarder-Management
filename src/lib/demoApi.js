const pad = value => String(value).padStart(2, "0");
const dateFromNow = days => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthFromNow = months => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const dateTimeFromNow = days => `${dateFromNow(days)}T14:00:00`;

const demoUsers = {
  admin: { id: 1, fullName: "Demo Admin", email: "admin@demo.local", phone: null, role: "admin", mustChangePassword: false, status: "active" },
  boarder: { id: 11, fullName: "Jamie Santos", email: "boarder@demo.local", phone: "09170000011", role: "boarder", mustChangePassword: false, status: "active" }
};

const rooms = [
  { id: 1, roomNumber: "101", floor: 1, monthlyRate: 6500, status: "occupied", boarderId: 11, boarder: "Jamie Santos", email: "boarder@demo.local", phone: "09170000011", occupancyId: 101, dueDay: 15, startedAt: dateFromNow(-95), waterRate: 350, lastElectricityReading: 428.5, lastElectricityPeriod: monthFromNow(-1), paymentStatus: { rent: "Overdue", electricity: "Due", water: "Paid" } },
  { id: 2, roomNumber: "102", floor: 1, monthlyRate: 6500, status: "occupied", boarderId: 12, boarder: "Alex Reyes", email: "alex@example.test", phone: "09170000012", occupancyId: 102, dueDay: 20, startedAt: dateFromNow(-62), waterRate: 350, lastElectricityReading: 311.2, lastElectricityPeriod: monthFromNow(-1), paymentStatus: { rent: "Paid", electricity: "Pending", water: "Paid" } },
  { id: 3, roomNumber: "103", floor: 1, monthlyRate: 6800, status: "vacant", boarderId: null, boarder: null, occupancyId: null, dueDay: null, startedAt: null, waterRate: 350, lastElectricityReading: 202.1, lastElectricityPeriod: monthFromNow(-2), paymentStatus: null },
  { id: 4, roomNumber: "201", floor: 2, monthlyRate: 7200, status: "occupied", boarderId: 13, boarder: "Mika Cruz", email: "mika@example.test", phone: "09170000013", occupancyId: 103, dueDay: 10, startedAt: dateFromNow(-150), waterRate: 350, lastElectricityReading: 516.8, lastElectricityPeriod: monthFromNow(-1), paymentStatus: { rent: "Paid", electricity: "Paid", water: "Paid" } },
  { id: 5, roomNumber: "202", floor: 2, monthlyRate: 7200, status: "vacant", boarderId: null, boarder: null, occupancyId: null, dueDay: null, startedAt: null, waterRate: 350, lastElectricityReading: null, lastElectricityPeriod: null, paymentStatus: null },
  { id: 6, roomNumber: "203", floor: 2, monthlyRate: 7500, status: "occupied", boarderId: 14, boarder: "Noah Garcia", email: "noah@example.test", phone: "09170000014", occupancyId: 104, dueDay: 25, startedAt: dateFromNow(-35), waterRate: 350, lastElectricityReading: 188.4, lastElectricityPeriod: monthFromNow(-1), paymentStatus: { rent: "Due", electricity: "Due", water: "Due" } }
];

const boarders = [
  { id: 11, fullName: "Jamie Santos", email: "boarder@demo.local", phone: "09170000011", status: "active", facebook: "Jamie S.", occupationSchool: "Graphic Designer", preferredMoveIn: dateFromNow(-95), preferredFloor: "First Floor", occupants: 1, emergencyContact: "Demo Contact • 09170009991", deposit: 6500, notes: "Portfolio demo account", occupancyId: 101, dueDay: 15, startedAt: dateFromNow(-95), roomId: 1, roomNumber: "101", floor: 1, monthlyRate: 6500, rentBalance: 6500, electricityBalance: 812.5, waterBalance: 0, remainingBalance: 7312.5, mustChangePassword: false },
  { id: 12, fullName: "Alex Reyes", email: "alex@example.test", phone: "09170000012", status: "active", facebook: "Alex R.", occupationSchool: "QA Engineer", preferredMoveIn: dateFromNow(-62), preferredFloor: "First Floor", occupants: 1, emergencyContact: "Demo Contact", deposit: 6500, notes: "", occupancyId: 102, dueDay: 20, startedAt: dateFromNow(-62), roomId: 2, roomNumber: "102", floor: 1, monthlyRate: 6500, rentBalance: 0, electricityBalance: 640, waterBalance: 0, remainingBalance: 640, mustChangePassword: false },
  { id: 13, fullName: "Mika Cruz", email: "mika@example.test", phone: "09170000013", status: "active", facebook: "Mika C.", occupationSchool: "Student", preferredMoveIn: dateFromNow(-150), preferredFloor: "Second Floor", occupants: 1, emergencyContact: "Demo Contact", deposit: 7200, notes: "", occupancyId: 103, dueDay: 10, startedAt: dateFromNow(-150), roomId: 4, roomNumber: "201", floor: 2, monthlyRate: 7200, rentBalance: 0, electricityBalance: 0, waterBalance: 0, remainingBalance: 0, mustChangePassword: false },
  { id: 14, fullName: "Noah Garcia", email: "noah@example.test", phone: "09170000014", status: "active", facebook: "Noah G.", occupationSchool: "Sales Associate", preferredMoveIn: dateFromNow(-35), preferredFloor: "Second Floor", occupants: 2, emergencyContact: "Demo Contact", deposit: 7500, notes: "", occupancyId: 104, dueDay: 25, startedAt: dateFromNow(-35), roomId: 6, roomNumber: "203", floor: 2, monthlyRate: 7500, rentBalance: 7500, electricityBalance: 775, waterBalance: 350, remainingBalance: 8625, mustChangePassword: false }
];

function boarderDashboard() {
  const current = monthFromNow(0);
  const previous = monthFromNow(-1);
  const oldest = dateFromNow(-9);
  const currentRentDue = dateFromNow(-4);
  const currentElectricDue = dateFromNow(2);
  const currentWaterDue = dateFromNow(3);
  const bills = [
    { id: 501, period: current, dueDate: currentRentDue, rentDueDate: currentRentDue, electricityDueDate: currentElectricDue, waterDueDate: currentWaterDue, roomRent: 6500, electricityAmount: 812.5, electricityConsumption: 65, electricityRate: 12.5, waterAmount: 350, totalAmount: 7662.5, status: "unpaid", rentPaid: 0, electricityPaid: 0, waterPaid: 350, rentPending: 0, electricityPending: 0, waterPending: 0, rentDue: 6500, electricityDue: 812.5, waterDue: 0, pendingAmount: 0, balance: 7312.5, carryover: 900, amountDue: 8212.5 },
    { id: 500, period: previous, dueDate: oldest, rentDueDate: oldest, electricityDueDate: dateFromNow(-8), waterDueDate: dateFromNow(-7), roomRent: 6500, electricityAmount: 780, electricityConsumption: 62.4, electricityRate: 12.5, waterAmount: 350, totalAmount: 7630, status: "unpaid", rentPaid: 6500, electricityPaid: 230, waterPaid: 350, rentPending: 0, electricityPending: 0, waterPending: 0, rentDue: 0, electricityDue: 550, waterDue: 0, pendingAmount: 0, balance: 550, carryover: 350, amountDue: 900 },
    { id: 499, period: monthFromNow(-2), dueDate: dateFromNow(-39), rentDueDate: dateFromNow(-39), electricityDueDate: dateFromNow(-38), waterDueDate: dateFromNow(-37), roomRent: 6500, electricityAmount: 720, electricityConsumption: 57.6, electricityRate: 12.5, waterAmount: 350, totalAmount: 7570, status: "unpaid", rentPaid: 6500, electricityPaid: 720, waterPaid: 0, rentPending: 0, electricityPending: 0, waterPending: 0, rentDue: 0, electricityDue: 0, waterDue: 350, pendingAmount: 0, balance: 350, carryover: 0, amountDue: 350 }
  ];
  return {
    boarder: demoUsers.boarder,
    occupancy: { id: 101, roomId: 1, roomNumber: "101", floor: 1, monthlyRate: 6500, dueDay: 15 },
    bills,
    receiptUploadAvailable: true,
    totalDue: 8212.5,
    depositBalance: 6500,
    oldestUnpaidDueDate: oldest,
    today: dateFromNow(0),
    overdueAmount: 7400,
    overdueSince: oldest,
    latestPaymentPromise: { note: "Boarder-selected payment date", promisedDate: dateFromNow(2), createdBy: 11, createdAt: dateTimeFromNow(-1) },
    promises: [
      { note: "I can settle the overdue balance after payday.", promisedDate: dateFromNow(2), createdBy: 11, createdAt: dateTimeFromNow(-1) },
      { note: "Admin follow-up completed by phone.", promisedDate: null, createdBy: 1, createdAt: dateTimeFromNow(-5) }
    ],
    bill: { id: 501, period: current, dueDate: currentRentDue, rentDueDate: currentRentDue, electricityDueDate: currentElectricDue, waterDueDate: currentWaterDue, roomRent: 6500, electricityAmount: 812.5, electricityConsumption: 65, electricityRate: 12.5, waterAmount: 350, totalAmount: 7662.5, status: "unpaid" },
    bank: { name: "Demo Bank", accountName: "Casa Vicenta Demo", accountNumber: "•••• 4821" },
    landlady: { name: "Property Manager", email: "hello@example.test", phone: "+63 917 000 0000" },
    payments: [
      { period: previous, paymentType: "rent", amount: 6500, paymentDate: dateFromNow(-22), verifiedAt: dateTimeFromNow(-22) },
      { period: previous, paymentType: "electricity", amount: 230, paymentDate: dateFromNow(-18), verifiedAt: dateTimeFromNow(-18) }
    ],
    complaints: [
      { id: 701, category: "Maintenance", subject: "Loose cabinet hinge", description: "Kitchen cabinet hinge needs tightening.", status: "resolved", createdAt: dateTimeFromNow(-16) },
      { id: 702, category: "Plumbing", subject: "Slow drain", description: "Bathroom drain is slow.", status: "submitted", createdAt: dateTimeFromNow(-2) }
    ]
  };
}

const settings = {
  electricity_rate: "12.50",
  electricity_due_day: "22",
  water_due_day: "23",
  water_monthly_amount: "350",
  bank_name: "Demo Bank",
  bank_account_name: "Casa Vicenta Demo",
  bank_account_number: "DEMO-4821",
  landlady_name: "Property Manager",
  landlady_email: "hello@example.test",
  landlady_phone: "+63 917 000 0000"
};

function adminResponse(path) {
  if (path === "/api/admin/dashboard") return {
    counts: { occupiedRooms: 4, vacantRooms: 2, dueSoon: 2, pendingReceipts: 2, newApplicants: 3, complaints: 2, paymentReminders: 1 },
    dueSoon: [
      { id: 1, roomNumber: "203", boarder: "Noah Garcia", dueDate: dateFromNow(1), totalAmount: 8625 },
      { id: 2, roomNumber: "102", boarder: "Alex Reyes", dueDate: dateFromNow(3), totalAmount: 7490 }
    ],
    paymentReminders: [
      { boarderId: 11, boarder: "Jamie Santos", roomNumber: "101", overdueSince: dateFromNow(-9), overdueAmount: 7400, promisedDate: dateFromNow(0), reminderStatus: "Due today" }
    ]
  };
  if (path === "/api/admin/rooms") return { rooms, availableBoarders: [{ id: 15, fullName: "Taylor Lim", email: "taylor@example.test", phone: "09170000015", status: "inactive" }] };
  if (path === "/api/admin/boarders") return { boarders, vacantRooms: rooms.filter(r => r.status === "vacant").map(({ id, roomNumber, floor }) => ({ id, roomNumber, floor })) };
  const profileMatch = path.match(/^\/api\/admin\/boarders\/(\d+)$/);
  if (profileMatch) {
    const id = Number(profileMatch[1]);
    const p = boarders.find(b => b.id === id) || boarders[0];
    return { profile: { ...p, deposit: p.deposit, notes: p.notes || "Demo profile", roomNumber: p.roomNumber }, promises: [{ note: "Will pay after payday.", promisedDate: dateFromNow(2), createdAt: dateTimeFromNow(-1) }] };
  }
  if (path === "/api/admin/room-history") return {
    start: monthFromNow(-5), end: monthFromNow(0),
    readings: [
      { roomNumber: "101", boarder: "Jamie Santos", period: monthFromNow(-2), previousReading: 320.5, currentReading: 365.1, consumption: 44.6, amount: 557.5 },
      { roomNumber: "101", boarder: "Jamie Santos", period: monthFromNow(-1), previousReading: 365.1, currentReading: 428.5, consumption: 63.4, amount: 792.5 },
      { roomNumber: "102", boarder: "Alex Reyes", period: monthFromNow(-1), previousReading: 260.0, currentReading: 311.2, consumption: 51.2, amount: 640 },
      { roomNumber: "201", boarder: "Mika Cruz", period: monthFromNow(-1), previousReading: 470.8, currentReading: 516.8, consumption: 46, amount: 575 },
      { roomNumber: "203", boarder: "Noah Garcia", period: monthFromNow(-1), previousReading: 126.4, currentReading: 188.4, consumption: 62, amount: 775 }
    ]
  };
  if (path === "/api/admin/payments") return { submissions: [
    { id: 801, boarder: "Alex Reyes", roomNumber: "102", period: monthFromNow(0), paymentType: "electricity", amount: 640, submittedAt: dateTimeFromNow(-1), status: "pending" },
    { id: 802, boarder: "Noah Garcia", roomNumber: "203", period: monthFromNow(0), paymentType: "rent", amount: 4000, submittedAt: dateTimeFromNow(-2), status: "pending" },
    { id: 803, boarder: "Mika Cruz", roomNumber: "201", period: monthFromNow(-1), paymentType: "rent", amount: 7200, submittedAt: dateTimeFromNow(-25), status: "approved" }
  ] };
  if (path === "/api/admin/applicants") return {
    requests: [
      { id: 901, applicant: "Casey Flores", phone: "09170000101", requestType: "reschedule", currentViewingAt: dateTimeFromNow(1), requestedViewingAt: dateTimeFromNow(4), message: "Could I move my viewing to the weekend?", createdAt: dateTimeFromNow(-1), status: "new", adminReply: "" },
      { id: 902, applicant: "Sam Dizon", phone: "09170000102", requestType: "question", currentViewingAt: null, requestedViewingAt: null, message: "Is Wi-Fi included?", createdAt: dateTimeFromNow(-2), status: "reviewed", adminReply: "Wi-Fi is discussed during viewing." }
    ],
    applicants: [
      { id: 1001, fullName: "Casey Flores", phone: "09170000101", facebook: "Casey F.", occupationSchool: "Customer Support", preferredMoveIn: dateFromNow(14), preferredFloor: "First Floor", occupants: 1, emergencyContact: "Demo Contact", scheduledAt: dateTimeFromNow(1), status: "scheduled" },
      { id: 1002, fullName: "Sam Dizon", phone: "09170000102", facebook: "Sam D.", occupationSchool: "Student", preferredMoveIn: dateFromNow(20), preferredFloor: "Second Floor", occupants: 1, emergencyContact: "Demo Contact", scheduledAt: null, status: "new" },
      { id: 1003, fullName: "Riley Tan", phone: "09170000103", facebook: "Riley T.", occupationSchool: "Freelancer", preferredMoveIn: dateFromNow(30), preferredFloor: "No Preference", occupants: 2, emergencyContact: "Demo Contact", scheduledAt: null, status: "new" }
    ],
    vacantRooms: rooms.filter(r => r.status === "vacant").map(({ id, roomNumber, floor }) => ({ id, roomNumber, floor }))
  };
  if (path === "/api/admin/complaints") return { complaints: [
    { id: 1101, roomNumber: "101", boarder: "Jamie Santos", category: "Plumbing", description: "Bathroom drain is slow.", status: "submitted", requestType: null, adminNotes: "" },
    { id: 1102, roomNumber: "203", boarder: "Noah Garcia", category: "password_reset", description: "Boarder requested a password reset.", status: "submitted", requestType: "password_reset", adminNotes: "" }
  ] };
  if (path === "/api/admin/users") return { users: [
    demoUsers.admin,
    ...boarders.map(b => ({ id: b.id, fullName: b.fullName, email: b.email, phone: b.phone, role: "boarder", status: b.status, mustChangePassword: false, roomNumber: b.roomNumber }))
  ], vacantRooms: rooms.filter(r => r.status === "vacant") };
  if (path === "/api/admin/settings") return { settings };
  return null;
}

export async function demoApi(path, options = {}) {
  await new Promise(resolve => setTimeout(resolve, 90));
  const method = String(options.method || "GET").toUpperCase();

  if (path === "/api/auth/me") return { user: null };
  if (path === "/api/auth/logout") return { ok: true };
  if (path === "/api/auth/login" && method === "POST") {
    const body = options.body || {};
    const identifier = String(body.identifier || "").toLowerCase();
    if (identifier.includes("boarder")) return { user: demoUsers.boarder };
    return { user: demoUsers.admin };
  }
  if (path === "/api/auth/forgot-password") return { message: "Demo mode: password reset request simulated." };
  if (path === "/api/auth/change-password") return { user: demoUsers.boarder };

  if (path === "/api/public/rooms") return { rooms: rooms.filter(r => r.status === "vacant").map(r => ({ id: r.id, roomNumber: r.roomNumber, floor: r.floor, monthlyRate: r.monthlyRate })) };
  if (path === "/api/public/contact") return { landladyName: "Property Manager", landladyEmail: "hello@example.test", landladyPhone: "+63 917 000 0000" };
  if (path === "/api/applications" && method === "POST") return { ok: true, message: "Demo mode: application submitted successfully." };
  if (path === "/api/public/applicant-requests" && method === "POST") return { ok: true, message: "Demo mode: request sent successfully." };

  if (path === "/api/boarder/dashboard") return boarderDashboard();
  if (path === "/api/boarder/contract") return { contract: { title: "Casa Vicenta House Rules", version: "demo-1.0", content: "Demo contract only.\n\n• Keep common areas clean.\n• Respect quiet hours.\n• Report maintenance concerns through the portal.\n• Payments shown here are sample data and do not represent real transactions." } };
  if (path === "/api/boarder/payments" && method === "POST") return { ok: true, message: "Demo mode: receipt upload simulated. No file was stored." };
  if (path === "/api/boarder/payment-promise" && method === "POST") return { ok: true, message: "Demo mode: payment promise saved for this session preview." };
  if (path === "/api/boarder/complaints" && method === "POST") return { ok: true, message: "Demo mode: complaint submitted." };

  const admin = adminResponse(path);
  if (admin && method === "GET") return admin;

  if (path === "/api/admin/electricity" && method === "POST") {
    const body = options.body || {};
    const previous = Number(body.previousReading || 0);
    const current = Number(body.currentReading || previous);
    const consumption = Math.max(0, current - previous);
    const amount = Math.round(consumption * Number(settings.electricity_rate) * 100) / 100;
    return { ok: true, consumption, amount, currentReading: current, electricityDueDate: dateFromNow(3), waterAmount: Number(settings.water_monthly_amount), waterDueDate: dateFromNow(4), rentDueDate: dateFromNow(2), total: amount + Number(settings.water_monthly_amount) + 6500, message: "Demo mode: monthly bill calculation simulated." };
  }

  if (method !== "GET") return { ok: true, message: "Demo mode: action simulated. Sample data is unchanged." };
  throw new Error(`Demo endpoint not implemented: ${path}`);
}
