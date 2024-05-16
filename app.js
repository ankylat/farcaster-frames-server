require("dotenv").config();
const cors = require("cors");
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const { replyToThisCast, castAnonymouslyWithFrame } = require("./lib/anky")
const { uploadSessionToIrys } = require("./lib/irys")

const farhackRoute = require("./routes/farhack");
const framesRoute = require("./routes/frames");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const port = 3003;

app.use("/farhack", farhackRoute);
app.use("/frames", framesRoute);

app.use(express.static('public'));

// ********* ROUTES ***********

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
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
    }

      axios.request(options).then(function (response) {
        return res.status(200).json({success: true, message: "the cast was deleted successfully"})
      }).catch(function (error){
        console.error(error)
      })
    } catch (error) {
        console.error(error);
        return res.status(500).json({success: false, message: "there was an error deleting your cast"})
    }
})

app.post("/finish-session", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    const irysReceiptHash = await uploadSessionToIrys(req.body.text);
    const responseFromCasting = await castAnonymouslyWithFrame(req.body.text, irysReceiptHash, fullUrl);
    console.log("the response from casting is", responseFromCasting);
    res.status(200).json({...responseFromCasting, message: 'your text was casted through anky'});
  } catch (error) {
    res.status(500).json({success: false, message: "there was an error saving the writing session on irys"})
  }
})

app.get("/invokeanky", async (req, res) => {
  try {
    console.log('inside the invoke anky get route')
    return res.status(200).json({
      "name": "Invoke Anky",
      "icon": "infinity",
      "description": "Have @anky reply to this cast.",
      "action": {
          "type": "post",
          "postUrl": `https://snarkyanky.lat/invokeanky`
      }
    })
  } catch (error) {
    console.log("there was an error retrieving the invoke anky action")
  }
})

app.post("/invokeanky", async (req,res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    console.log("time to invoke anky on this cast: ", req.body);
    const replyStatus = await replyToThisCast(req.body.untrustedData.castId.hash, fullUrl);
    console.log("the reply status is: ", replyStatus)
    res.status(200).json({
      "type": "message",
      "message": "your wishes are my replies",
    })
  } catch (error) {
    console.log("there was an error invoking anky");
    res.status(500).json({message: "error invoking anky"})
  }
})

// ********* FINISHED ***********

app.listen(port, () => {
  console.log(`anky server is listening on port ${port}`);
});
