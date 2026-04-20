import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "./db.js";
import { Room } from "../models/room.model.js";
import { Service } from "../models/service.model.js";
import { Transport } from "../models/transport.model.js";
import { MessPlan } from "../models/messPlan.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";

dotenv.config();

const seedData = async () => {
    try {
        await connectDB();

        const demoEmails = [
            "admin@staff.riphah.edu.pk",
            "warden@staff.riphah.edu.pk",
            "11111@students.riphah.edu.pk",
            "22222@students.riphah.edu.pk",
        ];

        await Promise.all([
            Room.deleteMany(),
            Service.deleteMany(),
            Transport.deleteMany(),
            MessPlan.deleteMany(),
            Notification.deleteMany({}),
            User.deleteMany({ email: { $in: demoEmails } }),
        ]);

        const levels = ["A", "B", "C"];
        const rooms = [];

        levels.forEach((level) => {
            for (let i = 1; i <= 15; i++) {
                const roomNumber = `${level}${i.toString().padStart(2, "0")}`;
                rooms.push({
                    level,
                    roomNumber,
                    capacity: i % 3 === 0 ? 3 : 2,
                    rent: 100000,
                });
            }
        });

        const createdRooms = await Room.insertMany(rooms);

        const wifiServices = [];
        for (let i = 0; i < createdRooms.length; i += 5) {
            const wifiGroup = createdRooms.slice(i, i + 5);
            const level = wifiGroup[0].level;
            const wifiName = `WIFI-${level}-${Math.floor(i / 5) + 1}`;

            wifiServices.push({
                name: wifiName,
                category: "utility",
                type: "wifi",
                description: `WiFi covering rooms ${wifiGroup
                    .map((r) => r.roomNumber)
                    .join(", ")}`,
                wifiRooms: wifiGroup.map((r) => r._id),
                isPaid: false,
                password: `Hostel@${level}${Math.floor(i / 5) + 1}`,
            });
        }

        await Service.insertMany([
            ...wifiServices,
            {
                name: "Laundry",
                type: "laundry",
                category: "paid",
                description: "Wash and fold laundry service.",
                isPaid: true,
                pricePerItem: 3,
            },
            {
                name: "Ironing",
                type: "ironing",
                category: "paid",
                description: "Ironing service.",
                isPaid: true,
                pricePerItem: 2,
            },
        ]);

        // Aligns with mobile app transport schedule naming (10 routes; Hostel ↔ University).
        const transportRoutes = [
            { routeName: "Morning Route 1", from: "Hostel", to: "University", departureTime: "07:00 AM", returnTime: "07:35 AM", driverName: "Rashid Khan", busNumber: "HTL-101", availableSeats: 40 },
            { routeName: "Morning Route 2", from: "Hostel", to: "University", departureTime: "08:00 AM", returnTime: "08:35 AM", driverName: "Zeeshan Ali", busNumber: "HTL-102", availableSeats: 40 },
            { routeName: "Morning Route 3", from: "Hostel", to: "University", departureTime: "09:00 AM", returnTime: "09:40 AM", driverName: "Aftab Hussain", busNumber: "HTL-103", availableSeats: 40 },
            { routeName: "Morning Route 4", from: "Hostel", to: "University", departureTime: "10:00 AM", returnTime: "10:35 AM", driverName: "Sohail Ahmed", busNumber: "HTL-104", availableSeats: 40 },
            { routeName: "Morning Route 5", from: "Hostel", to: "University", departureTime: "11:00 AM", returnTime: "11:35 AM", driverName: "Nasir Iqbal", busNumber: "HTL-105", availableSeats: 40 },
            { routeName: "Return Route 1", from: "University", to: "Hostel", departureTime: "12:00 PM", returnTime: "12:35 PM", driverName: "Arshad Malik", busNumber: "HTL-106", availableSeats: 40 },
            { routeName: "Return Route 2", from: "University", to: "Hostel", departureTime: "01:30 PM", returnTime: "02:05 PM", driverName: "Imran Qureshi", busNumber: "HTL-107", availableSeats: 40 },
            { routeName: "Return Route 3", from: "University", to: "Hostel", departureTime: "03:00 PM", returnTime: "03:40 PM", driverName: "Tariq Shah", busNumber: "HTL-108", availableSeats: 40 },
            { routeName: "Return Route 4", from: "University", to: "Hostel", departureTime: "04:00 PM", returnTime: "04:40 PM", driverName: "Kamran Javed", busNumber: "HTL-109", availableSeats: 40 },
            { routeName: "Return Route 5", from: "University", to: "Hostel", departureTime: "05:00 PM", returnTime: "05:35 PM", driverName: "Farhan Abbas", busNumber: "HTL-110", availableSeats: 40 },
        ];

        await Transport.insertMany(transportRoutes);

        // mess plans with prices
        await MessPlan.insertMany([
            {
                day: "Monday",
                meals: {
                    breakfast: { items: ["Paratha", "Omelette", "Tea"], price: 200 },
                    lunch: { items: ["Daal Chawal", "Salad"], price: 300 },
                    dinner: { items: ["Chicken Karahi", "Roti"], price: 400 },
                },
            },
            {
                day: "Tuesday",
                meals: {
                    breakfast: { items: ["Halwa Puri", "Tea"], price: 200 },
                    lunch: { items: ["Biryani", "Raita"], price: 300 },
                    dinner: { items: ["Daal Mash", "Rice"], price: 400 },
                },
            },
            {
                day: "Wednesday",
                meals: {
                    breakfast: { items: ["Aloo Paratha", "Yogurt"], price: 200 },
                    lunch: { items: ["Mixed Vegetables", "Chapati"], price: 300 },
                    dinner: { items: ["Qorma", "Naan"], price: 400 },
                },
            },
            {
                day: "Thursday",
                meals: {
                    breakfast: { items: ["Toast", "Omelette", "Milk"], price: 200 },
                    lunch: { items: ["Chana Pulao", "Raita"], price: 300 },
                    dinner: { items: ["Bhindi", "Chapati"], price: 400 },
                },
            },
            {
                day: "Friday",
                meals: {
                    breakfast: { items: ["Aloo Paratha", "Tea"], price: 200 },
                    lunch: { items: ["Chicken Pulao", "Salad"], price: 300 },
                    dinner: { items: ["Keema", "Roti"], price: 400 },
                },
            },
            {
                day: "Saturday",
                meals: {
                    breakfast: { items: ["Egg", "Paratha", "Tea"], price: 200 },
                    lunch: { items: ["Vegetable Rice", "Salad"], price: 300 },
                    dinner: { items: ["Beef Nihari", "Naan"], price: 400 },
                },
            },
            {
                day: "Sunday",
                meals: {
                    breakfast: { items: ["Halwa Puri", "Tea"], price: 200 },
                    lunch: { items: ["Biryani", "Raita"], price: 300 },
                    dinner: { items: ["Chicken Roast", "Naan"], price: 400 },
                },
            },
        ]);

        // hash admin password (web panel: admin + warden accounts — use setWebStaffPassword.js to sync existing DB)
        const plainPassword = "Adeeba11222";
        const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 = salt rounds
        const studentDemoPassword = await bcrypt.hash("Student123!", 10);

        await User.create({
            fullName: "System Admin",
            email: "admin@staff.riphah.edu.pk",
            password: hashedPassword,
            role: "admin",
            isActive: true,
        });

        await User.create({
            fullName: "Demo Warden",
            email: "warden@staff.riphah.edu.pk",
            password: hashedPassword,
            role: "warden",
            isActive: true,
        });

        await User.insertMany([
            {
                fullName: "Demo Student One",
                email: "11111@students.riphah.edu.pk",
                password: studentDemoPassword,
                role: "student",
                isActive: true,
            },
            {
                fullName: "Demo Student Two",
                email: "22222@students.riphah.edu.pk",
                password: studentDemoPassword,
                role: "student",
                isActive: true,
            },
        ]);

        await Notification.create({
            users: [],
            audience: ["student", "warden"],
            title: "Welcome to RiphahStay",
            text: "This is a sample announcement. Admins can send more from Notifications on the web portal.",
            type: "info",
        });

        console.log("Seeding completed.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedData();
