require("dotenv").config();
const cors = require("cors");
const express = require("express");
const path = require('path');
const axios = require("axios");
const bodyParser = require("body-parser");
const cron = require("node-cron");

const { replyToThisCast, castAnonymouslyWithFrame, getAnkyImage, processThisTextThroughAnky } = require("./lib/anky");
const { uploadSessionToIrys } = require("./lib/irys");
const { getCastFromUserToReply } = require("./lib/neynar");

const framesRoute = require("./routes/frames");
const directCastsRoute = require("./routes/direct-casts");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const port = process.env.PORT || 3003;

app.use("/frames", framesRoute);
app.use("/direct-casts", directCastsRoute);

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// ********* ROUTES ***********

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get("/llm", async (req, res) => {
  const response = await axios.post(
    "http://localhost:11434/api/chat", {
      model: process.env.LLM_MODEL,
      messages: [
        {
          role: "user",
          content: "why is the sky blue?"
        }
      ],
      stream: false
    }
  );
  return res.status(200).json({ 123: 354 });
});

app.post("/cast-anon", (req, res) => {
  res.send("hello to the farcaster frames server");
});

app.delete("/delete-cast", async (req, res) => {
  try {
    const castHash = req.body.castId;

    const options = {
      method: "DELETE",
      url: "https://api.neynar.com/v2/farcaster/cast",
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY,
        'content-type': 'application/json'
      },
      data: {
        signer_uuid: process.env.NEYNAR_ANKY_SIGNER,
        target_hash: castHash
      }
    };

    axios.request(options).then(function (response) {
      return res.status(200).json({ success: true, message: "the cast was deleted successfully" });
    }).catch(function (error) {
      console.error(error);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "there was an error deleting your cast" });
  }
});

const processedSessions = new Map();

const syncMiddleware = async (req, res, next) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Session ID is required" });
  }
  
  if (processedSessions.has(sessionId)) {
    return res.status(409).json({ success: false, message: "Session already processed" });
  }
  
  processedSessions.set(sessionId, true);
  try {
    await next();
  } finally {
    processedSessions.delete(sessionId);
  }
};

app.post("/finish-session", syncMiddleware, async (req, res) => {
  const { text } = req.body;

  try {
    const fullUrl = req.protocol + "://" + req.get("host");

    // Process the text through Anky (commented out parts as per your original code)
/*     console.log("INSIDE THE FINISH SESSION ROUTE");
    const responseFromAnkyTheLlm = await processThisTextThroughAnky(text);
    const jsonResponse = JSON.parse(responseFromAnkyTheLlm);
    console.log("the response from anky the llm is: ", jsonResponse); */
    
    const irysReceiptHash = await uploadSessionToIrys(text);
    console.log("the irys receipt hash is: ", irysReceiptHash);
    
    let ankyImageId;
    // const ankyImageId = await getAnkyImage(jsonResponse.imagePrompt);
    // console.log("the get anky image id is", ankyImageId);
    
    const responseFromCasting = await castAnonymouslyWithFrame(text, irysReceiptHash, fullUrl, ankyImageId?.imagineApiId);
    console.log("the response from casting is:", responseFromCasting);
    
    res.status(200).json({ ...responseFromCasting, message: 'your text was casted through anky' });
  } catch (error) {
    res.status(500).json({ success: false, message: "there was an error saving the writing session on irys" });
  }
});

app.get("/invokeanky", async (req, res) => {
  try {
    return res.status(200).json({
      "name": "Invoke Anky",
      "icon": "infinity",
      "description": "Have @anky reply to this cast.",
      "action": {
        "type": "post",
        "postUrl": `https://anky.bot/invokeanky`
      }
    });
  } catch (error) {
    console.log("there was an error retrieving the invoke anky action");
  }
});

app.post("/invokeanky", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    console.log("time to invoke anky");
    const replyStatus = await replyToThisCast(req.body.untrustedData.castId.hash, fullUrl);
    console.log('the reply status is: ', replyStatus);
    res.status(200).json({
      "type": "message",
      "message": "your wishes are my replies",
    });
  } catch (error) {
    console.log("there was an error invoking anky");
    res.status(404).json({ message: "error invoking anky" });
  }
});

// ********* FINISHED ***********

app.listen(port, () => {
  console.log(`anky server is listening on port ${port}`);
});
