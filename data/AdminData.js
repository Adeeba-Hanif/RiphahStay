// src/data/AdminData.js

// top stats
export const adminStats = {
  totalStudents: 240,
  totalRooms: 50,
  occupiedRooms: 45,
  lateToday: 5,
  pendingComplaints: 2,
};

// notifications
export const adminNotifications = [
  { id: 1, text: "Monthly hostel report submitted", timeAgo: "1h ago" },
  { id: 2, text: "2 students marked late today", timeAgo: "2h ago" },
  { id: 3, text: "Warden Sara updated room allocations", timeAgo: "5h ago" },
];

// students (small demo list)
export const adminStudents = [
  { id: 1, name: "Ayesha Khan", reg: "HS-001", room: "A-203" },
  { id: 2, name: "Zainab Fatima", reg: "HS-002", room: "B-108" },
  { id: 3, name: "Hira Shah", reg: "HS-003", room: "C-305" },
  { id: 4, name: "Mariam Malik", reg: "HS-004", room: "C-102" },
];

// NEW: hostels list
export const adminHostels = [
  {
    id: 1,
    name: "Riphah Girls Hostel - I-14",
    address: "Near Gate 2, Riphah International University, I-14 Campus, Islamabad",
    capacity: 120,
    occupied: 110,
    warden: "Sara Ahmed",
  },
  {
    id: 2,
    name: "Riphah Girls Hostel - F-10",
    address: "Street 7, House 22, F-10/2, Islamabad",
    capacity: 80,
    occupied: 72,
    warden: "Hina Malik",
  },
  {
    id: 3,
    name: "Riphah Girls Hostel - Peshawar Rd.",
    address: "Service Rd, near H-13, Islamabad",
    capacity: 60,
    occupied: 54,
    warden: "Laiba Riaz",
  },
];

// NEW: finance data
export const adminFinance = [
  {
    id: 1,
    student: "Ayesha Khan",
    reg: "HS-001",
    hostel: "Riphah Girls Hostel - I-14",
    amount: 230000,
    date: "2025-11-01",
  },
  {
    id: 2,
    student: "Zainab Fatima",
    reg: "HS-002",
    hostel: "Riphah Girls Hostel - I-14",
    amount: 230000,
    date: "2025-11-02",
  },
  {
    id: 3,
    student: "Hira Shah",
    reg: "HS-003",
    hostel: "Riphah Girls Hostel - F-10",
    amount: 225000,
    date: "2025-11-03",
  },
];

// NEW: transport routes
export const adminTransport = [
  {
    id: 1,
    routeName: "Morning Route A",
    from: "I-14 Hostel",
    to: "Riphah Main Campus",
    time: "07:00 AM",
    driver: "Imran Khan",
    bus: "BUS-001",
  },
  {
    id: 2,
    routeName: "Morning Route B",
    from: "F-10 Hostel",
    to: "Riphah Main Campus",
    time: "07:30 AM",
    driver: "Ali Raza",
    bus: "BUS-002",
  },
  {
    id: 3,
    routeName: "Return Route",
    from: "Riphah Main Campus",
    to: "I-14 Hostel",
    time: "05:00 PM",
    driver: "Hassan Malik",
    bus: "BUS-003",
  },
];
