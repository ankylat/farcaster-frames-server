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
    console.log("req", req.query);
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
          <text x="16%" y="25%" class="text" dominant-baseline="hanging">${imageCopy}</text>
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
    console.log("inside the post route", req.body);
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
    console.log("this is the second frame route.", req.body);
    const fullUrl = req.protocol + "://" + req.get("host");

    if (
      [1, 2, 3].includes(req.body.untrustedData.buttonIndex) ||
      req.body.untrustedData.inputText
    ) {
      // send this information to the bot so that it can know how often to reply
      let isValidNumber = Number(req.body.untrustedData.inputText);
      console.log("the is valid number is: ", isValidNumber);
      if (!isValidNumber) {
        console.log(req.body.untrustedData);
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
      const repliesPerDay = req.body.untrustedData.textInput;
      imageCopy = "your preference is known.";
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
      imageCopy = "enter a number smaller than 10";
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
        <meta name="fc:frame:input:text" content="send" />
        <meta name="fc:frame:button:1" content="submit" />
        </head>
      </html>
        `);
    }
  } catch (error) {
    console.log("there was an error here", error);
  }
});

module.exports = router;
