const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const sharp = require("sharp");
const prisma = require("../../lib/prismaClient");

///////////// MIDJOURNEY ON A FRAME  ////////////////////////

const botName = ``;

router.get("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${botName}</title>
      <meta property="og:title" content="${botName}">
      <meta property="og:image" content="https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true">
      <meta name="fc:frame:post_url" content="${fullUrl}/farhack">
      <meta name="fc:frame:button:1" content="activate ${botName}">
    </head>
    </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

router.get("/image", async (req, res) => {
  try {
    const imageCopy = decodeURIComponent(req.query.text);

    const response = await axios({
      url: "https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true",
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data, "binary");
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    // Prepare a black overlay as an SVG with lowered opacity
    const blackOverlay = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="black" fill-opacity="0.6"></rect>
          <style>
            .text { font: bold 48px sans-serif; fill: white; text-anchor: start; }
          </style>
          <text x="12%" y="25%" class="text" dominant-baseline="hanging">${imageCopy}</text>
        </svg>`;

    sharp(imageBuffer)
      .composite([{ input: Buffer.from(blackOverlay), gravity: "center" }])
      .toFormat("png")
      .toBuffer()
      .then((outputBuffer) => {
        // Optionally save to a file for debugging
        fs.writeFileSync("output_with_overlay.png", outputBuffer);
        res.setHeader("Content-Type", "image/png");
        res.send(outputBuffer);
      })
      .catch((error) => {
        console.error("Error processing image", error);
        res.status(500).send("Error processing image");
      });
  } catch (error) {
    console.error("There was an error creating the image", error);
    res.status(500).send("An error occurred");
  }
});

router.post("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    const imageCopy = "times per day?";
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
      imageCopy
    )}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:button:1" content="1" />
        <meta name="fc:frame:button:2" content="2" />
        <meta name="fc:frame:button:3" content="3" />
        <meta name="fc:frame:button:4" content="custom" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

router.post("/second-frame", async (req, res) => {
  try {
    let imageCopy;
    const fullUrl = req.protocol + "://" + req.get("host");
    if (req.body.untrustedData.inputText) {
      let inputText = req.body.untrustedData.inputText;
      let isValidNumber = Number(inputText);
      if (isValidNumber) {
        if (isValidNumber < 11) {
          imageCopy = `your preference is known. ${isValidNumber}.`;
          return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
            imageCopy
          )}>
          </head>
        </html>
          `);
        } else {
          imageCopy = req.body.untrustedData.inputText;
          return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
            imageCopy
          )}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
          <meta name="fc:frame:button:1" content="submit" />
          </head>
        </html>
          `);
        }
      } else {
        // this is the place
        imageCopy = req.body.untrustedData.inputText;
        return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
          imageCopy
        )}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
          <meta name="fc:frame:button:1" content="submit" />
          </head>
        </html>
          `);
      }
    }

    if ([1, 2, 3].includes(req.body.untrustedData.buttonIndex)) {
      imageCopy = `your preference is known. ${req.body.untrustedData.buttonIndex}.`;
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
        imageCopy
      )}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          </head>
        </html>
          `);
    }

    imageCopy = "how many times per day you want to be roasted?";

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
      imageCopy
    )}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
        <meta name="fc:frame:button:1" content="submit" />
        </head>
      </html>
        `);
  } catch (error) {
    console.log("there was an error here", error);
  }
});

module.exports = router;
