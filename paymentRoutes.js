const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const db = require("./db");

// Easebuzz API URLs
const BASE_URL = process.env.ENV === "test" ? "https://testpay.easebuzz.in" : "https://pay.easebuzz.in";

// Generate unique transaction ID
function generateTxnId() {
    return "TXN" + Date.now();
}

/**
 * Generate hash for Easebuzz payment
 * Follows strict Easebuzz hash generation requirements
 */
function generateHash(data, salt) {
    // NOTE: Order of parameters is critical for Easebuzz
    const hashString = [
        data.key,
        data.txnid,
        data.amount,
        data.productinfo,
        data.firstname,
        data.email,
        data.udf1 || "",
        data.udf2 || "",
        data.udf3 || "",
        data.udf4 || "",
        data.udf5 || "",
        data.udf6 || "",
        data.udf7 || "",
        data.udf8 || "",
        data.udf9 || "",
        data.udf10 || "",
        salt,
    ].join("|");

    console.log("Hash String:", hashString);
    return crypto.createHash("sha512").update(hashString).digest("hex");
}

// Initiate payment route
router.get("/initiate-payment", async (req, res) => {
    try {
        const txnid = generateTxnId();

        // Core required fields - keeping it minimal to avoid validation issues
        const txnData = {
            key: process.env.MERCHANT_KEY,
            txnid: txnid,
            amount: req.amount,
            productinfo: req.productinfo,
            firstname: req.firstname,
            email: req.email,
            phone: req.phone,
            surl: `${req.protocol}://${req.get("host")}/payment-success`,
            furl: `${req.protocol}://${req.get("host")}/payment-failure`,
            udf1: "",
            udf2: "",
            udf3: "",
            udf4: "",
            udf5: "",
        };

        // Generate hash and add to data
        const hash = generateHash(txnData, process.env.SALT);
        txnData.hash = hash;

        console.log("Payment Request Data:", {
            url: `${BASE_URL}/payment/initiateLink`,
            key: txnData.key,
            txnid: txnData.txnid,
            amount: txnData.amount,
        });

        // Must use form-urlencoded format which Easebuzz prefers for some endpoints
        const formData = new URLSearchParams();
        Object.entries(txnData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        // Send request to Easebuzz
        const response = await axios.post(`${BASE_URL}/payment/initiateLink`, formData, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        console.log("Easebuzz Response:", response.data);

        if (response.data.status === 1) {
            // Payment link generated successfully
            try {
                await db.query(
                    `INSERT INTO payments (txnid, amount, firstname, email, phone,request, status)
          VALUES ($1, $2, $3, $4, $5,$6, 'pending')`,
                    [txnid, txnData.amount, txnData.firstname, txnData.email, txnData.phone, txnData]
                );
            } catch (dbErr) {
                console.error("Database error:", dbErr);
                // Continue with payment even if DB fails
            }
            const paymentURL = `${BASE_URL}/pay/${response.data.data}`;
            return res.redirect(paymentURL);
        } else {
            // Payment initialization failed
            console.error("Payment initiation failed:", response.data);
            // return res.status(400).json({
            //   error: response.data.error_desc || "Payment initiation failed",
            //   code: response.data.error || "UNKNOWN"
            // });
            return res.json({success: false, message: "Payment initiation failed"});
        }
    } catch (error) {
        console.error("Easebuzz Error:", error.response?.data || error.message);
        if (error.response && error.response.data) {
            //return res.status(400).json(error.response.data);
            return res.json({success: false, message: error.response.data});
        }
        // return res.status(500).json({
        //   error: "Server error while initiating payment",
        //   details: error.message
        // });
        return res.json({success: false, message: "Server error while initiating payment"});
    }
});

// Handle payment success
router.post("/payment-success", async (req, res) => {
    try {
        console.log("Payment Success Callback:", req.body);
        const {txnid, status} = req.body;

        if (!txnid) {
            //return res.status(400).send("Invalid payment response: Missing transaction ID");
            return res.json({success: false, message: "Invalid payment response: Missing transaction ID"});
        }

        await db.query(`UPDATE payments SET status = $1, response = $2 WHERE txnid = $3`, [
            status || "success",
            JSON.stringify(req.body),
            txnid,
        ]);

        //return res.send("Payment successful");
        return res.json({success: true, message: "Payment successful"});
    } catch (err) {
        console.error("Payment success handler error:", err);
        //return res.status(500).send("Error processing successful payment");
        return res.json({success: false, message: "Error processing successful payment"});
    }
});

// Handle payment failure
router.post("/payment-failure", async (req, res) => {
    try {
        console.log("Payment Failure Callback:", req.body);
        const {txnid, error_Message, status} = req.body;

        if (!txnid) {
            //return res.status(400).send("Invalid payment response: Missing transaction ID");
            return res.json({success: false, message: "Invalid payment response: Missing transaction ID"});
        }

        await db.query(`UPDATE payments SET status = $1, response = $2, error_msg = $3 WHERE txnid = $4`, [
            status || "failure",
            JSON.stringify(req.body),
            error_Message || "",
            txnid,
        ]);

        //return res.send("Payment failed");
        return res.json({success: true, message: "Payment failed data saved"});
    } catch (err) {
        console.error("Payment failure handler error:", err);
        return res.json({success: false, message: err});
        //return res.status(500).send("Error processing failed payment");
    }
});

// Add a route to debug and test hash generation
// router.get("/test-hash", (req, res) => {
//   const testData = {
//     key: process.env.MERCHANT_KEY,
//     txnid: "TXN" + Date.now(),
//     amount: "500.00",
//     productinfo: "Node.js Course",
//     firstname: "Sangeetha",
//     email: "Sangeetha@gmail.com",
//     udf1: "",
//     udf2: "",
//     udf3: "",
//     udf4: "",
//     udf5: ""
//   };

//   const hash = generateHash(testData, process.env.SALT);

//   res.json({
//     testData,
//     hash,
//     hashString: [
//       testData.key,
//       testData.txnid,
//       testData.amount,
//       testData.productinfo,
//       testData.firstname,
//       testData.email,
//       testData.udf1 || '',
//       testData.udf2 || '',
//       testData.udf3 || '',
//       testData.udf4 || '',
//       testData.udf5 || '',
//       '',
//       '',
//       '',
//       '',
//       '',
//       process.env.SALT
//     ].join('|')
//   });
// });

module.exports = router;
