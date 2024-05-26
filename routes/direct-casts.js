// /routes/direct-casts.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // For generating idempotency keys

router.get(`/`, async (req, res) => {
  try {
    const idempotencyKey = uuidv4();
    const apiUrl = 'https://api.warpcast.com/v2/ext-send-direct-cast';
    const apiKey = process.env.WARPCAST_API_KEY;
    const response = await axios.put(apiUrl, {
      recipientFid: 16098,
      message: 'wena conchetumareeeee',
      idempotencyKey
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("the response from sending the cast is: ", response.data)
    res.status(500).json({ success: false, message: "The DC was sent" });

  } catch (error) {
    console.error('thaejhkdaclsajc',error);
    res.status(500).json({ success: false, message: "Error sending Direct Cast" });
  }
})

router.put('/', async (req, res) => {
  let { recipientFid, message, idempotencyKey } = req.body;
  console.log(`we have a direct cast from ${recipientFid}, and the message it brings is: `, message);

  if (!recipientFid || !message) {
    return res.status(400).json({ success: false, message: "recipientFid and message are required" });
  }

  if (!idempotencyKey) {
    idempotencyKey = uuidv4();
  }

  const apiUrl = 'https://api.warpcast.com/v2/ext-send-direct-cast';
  const apiKey = process.env.WARPCAST_API_KEY;

  try {
    const response = await axios.put(apiUrl, {
      recipientFid,
      message,
      idempotencyKey
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('the response is: ', response.data)
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('there was an error on the direct cast route',error);
    res.status(500).json({ success: false, message: "Error sending Direct Cast" });
  }
});

module.exports = router;


