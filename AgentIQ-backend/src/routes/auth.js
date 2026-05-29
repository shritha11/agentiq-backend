import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/firebase.js";

const router = Router();

router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await db.collection("users").where("email", "==", email).get();

        if(!existingUser.empty) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userRef = await db.collection("users").add({email, passwordHash, createdAt: new Date()});

        const token = jwt.sign(
            {
                userId: userRef.id,
                email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.json({ 
            token,
            userId: userRef.id,
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: "Signup failed",
        });
    }
});

router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        const snapshot = await db.collection("users").where("email", "==", email).get();

        if (snapshot.empty) {
            return res.status(400).json({
                error: "invalid credentials",
            });
        }

        const userDoc = snapshot.docs[0];

        const user = userDoc.data();

        const valid = await bcrypt.compare(password, user.passwordHash);

        if(!valid) {
            return res.status(400).json({
                error: "Invalid credentials",
            });
        }

        const token = jwt.sign(
            {
                userId: userDoc.id,
                email,
            }, 
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.json({ 
            token, 
            userId: userDoc.id,
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({ 
            error: "Login failed",
        });
    }
});

export default router;