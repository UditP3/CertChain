
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
}));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (
            file.mimetype === "application/pdf" &&
            file.originalname.toLowerCase().endsWith(".pdf")
        ) {
            callback(null, true);
        } else {
            callback(new Error("Only PDF files are allowed."));
        }
    }
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "CertChain IPFS backend is running."
    });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!process.env.PINATA_JWT) {
            return res.status(500).json({
                error: "Pinata JWT is not configured."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Please select a PDF file."
            });
        }

        const formData = new FormData();

        const pdfBlob = new Blob(
            [req.file.buffer],
            { type: "application/pdf" }
        );

        formData.append("file", pdfBlob, req.file.originalname);
        formData.append("network", "public");

        const pinataResponse = await fetch(
            "https://uploads.pinata.cloud/v3/files",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.PINATA_JWT}`
                },
                body: formData
            }
        );

        const result = await pinataResponse.json();

        if (!pinataResponse.ok) {
            console.error("Pinata upload failed:", result);

            return res.status(502).json({
                error: "Pinata could not upload the file."
            });
        }

        const cid = result.data?.cid;

        if (!cid) {
            console.error("Unexpected Pinata response:", result);

            return res.status(502).json({
                error: "Pinata did not return a CID."
            });
        }

        res.json({
            success: true,
            name: req.file.originalname,
            cid: cid
        });

    } catch (error) {
        console.error("Upload error:", error.message);

        res.status(500).json({
            error: "The PDF upload failed. Check the backend terminal."
        });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: err.code === "LIMIT_FILE_SIZE"
                ? "PDF must be 10 MB or smaller."
                : err.message
        });
    }

    if (err) {
        return res.status(400).json({
            error: err.message
        });
    }

    next();
});

app.listen(PORT, () => {
    console.log(`CertChain IPFS backend running at http://localhost:${PORT}`);
});
