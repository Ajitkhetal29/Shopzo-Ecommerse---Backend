// import bcrypt from "bcryptjs";
// import User from "../models/user.js";
// import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config({path: '../.env' });

// const MONGODB_URI = process.env.MONGO_URI;

// if (!MONGODB_URI) {
//   console.error("❌ MONGO_URI missing");
//   process.exit(1);
// }

// const users = [

//   // =========================
//   // DELIVERY DEPARTMENT
//   // =========================

//   // Managers (Delivery)
//   {
//     name: "Anand Pandey",
//     email: "pandey.anand@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Rohit Sharma",
//     email: "sharma.rohit@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Vikram Singh",
//     email: "singh.vikram@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Manish Verma",
//     email: "verma.manish@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Deepak Yadav",
//     email: "yadav.deepak@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f6a515bab475b9278868",
//   },

//   // Team Leaders (Delivery)
//   {
//     name: "Saurabh Mishra",
//     email: "mishra.saurabh@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Amit Tiwari",
//     email: "tiwari.amit@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Nitin Joshi",
//     email: "joshi.nitin@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Harsh Agrawal",
//     email: "agrawal.harsh@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Karan Malhotra",
//     email: "malhotra.karan@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f6a515bab475b9278868",
//   },

//   // Team Members (Delivery)
//   {
//     name: "Rahul Chauhan",
//     email: "chauhan.rahul@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Priyansh Saxena",
//     email: "saxena.priyansh@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Arjun Kapoor",
//     email: "kapoor.arjun@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Mohit Bansal",
//     email: "bansal.mohit@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f6a515bab475b9278868",
//   },
//   {
//     name: "Shubham Jain",
//     email: "jain.shubham@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f6a515bab475b9278868",
//   },

//   // =========================
//   // SUPPORT DEPARTMENT
//   // =========================

//   // Managers (Support)
//   {
//     name: "Abhishek Kulkarni",
//     email: "kulkarni.abhishek@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Rajat Mehta",
//     email: "mehta.rajat@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Tarun Arora",
//     email: "arora.tarun@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Kunal Deshmukh",
//     email: "deshmukh.kunal@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Aditya Nair",
//     email: "nair.aditya@shopzo.com",
//     password: "1234",
//     role: "69a6f6d015bab475b9278884",
//     department: "69a6f665d9d4acf55ef34a14",
//   },

//   // Team Leaders (Support)
//   {
//     name: "Sneha Patil",
//     email: "patil.sneha@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Neha Reddy",
//     email: "reddy.neha@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Pooja Sharma",
//     email: "sharma.pooja@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Ishita Ghosh",
//     email: "ghosh.ishita@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Kriti Malviya",
//     email: "malviya.kriti@shopzo.com",
//     password: "1234",
//     role: "69a6f71765a21a64cb87bf0f",
//     department: "69a6f665d9d4acf55ef34a14",
//   },

//   // Team Members (Support)
//   {
//     name: "Ayush Gupta",
//     email: "gupta.ayush@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Riya Chatterjee",
//     email: "chatterjee.riya@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Tanya Bhardwaj",
//     email: "bhardwaj.tanya@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Varun Sethi",
//     email: "sethi.varun@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f665d9d4acf55ef34a14",
//   },
//   {
//     name: "Anjali Roy",
//     email: "roy.anjali@shopzo.com",
//     password: "1234",
//     role: "69a6f73065a21a64cb87bf13",
//     department: "69a6f665d9d4acf55ef34a14",
//   },

// ];


// const createUsers = async () => {
//   try {
//     for (const userData of users) {
//       const { name, email, password, department, role } = userData;

//       const existingUser = await User.findOne({ email });
//       if (existingUser) {
//         console.log(`⚠️ ${email} already exists. Skipping...`);
//         continue;
//       }

//       const hashedPassword = await bcrypt.hash(password, 10);

//       await User.create({
//         name,
//         email,
//         password: hashedPassword,
//         department,
//         role,
//       });

//       console.log(`✅ Created: ${email}`);
//     }

//     console.log("🎉 All users processed");
//   } catch (error) {
//     console.error("❌ Error creating users:", error);
//   }
// };

// const initialize = async () => {
//   try {
//     await mongoose.connect(MONGODB_URI);
//     console.log("✅ Connected to MongoDB");

//     await createUsers(); // 👈 THIS WAS MISSING

//     await mongoose.disconnect();
//     console.log("🔌 Disconnected");
//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Initialization error:", error);
//     process.exit(1);
//   }
// };

// initialize();


let a = 10;

for (let i = 1; i <=2; i++) {
  console.log(a -i);
}

console.log(a);

for (let i = 1; i <=2; i++) {
  console.log(a + i);
}