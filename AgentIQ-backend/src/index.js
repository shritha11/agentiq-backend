import "dotenv/config";
import express from "express";
import cors from "cors";
import generateRouter from "./routes/generate.js";

const app = express();
const PORT = process.env.port || 8000;

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.use(express.json({limit: "10mb"}));

app.use(express.urlencoded({ extended: true, limit: "10mb"}));

//SECURITY HEADERS
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});

//Request logger - logs every incoming request 
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`$[{timestamp}] ${req.method} ${req.path}`);
    next();
});

app.get("/health", (req, res) => {
    res.json({status: "ok", service: "agentiq-backend", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || "development",
    });
});

app.use("/api", generateRouter);

//404 handler- catches any request that didn't match any route above, * MEANS any path that wasn't mentioned
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl, 
        method: req.method,
        hint: "Available routes: GET /health, POST /api/generate, GET /api/stream/:jobId",
    });
});

app.use((err, req, res, next) => {
    console.log("Unhandled error:", err);
    res.status(err.status || 5000).json({
        error: err.message || "Internal server error", 
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

app.listen(PORT, () => {
    console.log(`agentiq-backend running 
        Local:   http://localhost:${PORT}
   Health:  http://localhost:${PORT}/health
   Env:     ${process.env.NODE_ENV || "development"}
   `);
});