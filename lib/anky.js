const axios = require("axios");

const LLM_SERVER_URL = "http://localhost:8000/v1/completions";

function createChatTemplate(systemPrompt, userQuery) {
  const chatTemplate = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userQuery}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
  return chatTemplate;
}

// todo: function with chat history
function createChatTemplateHistory(systemPrompt, userQuery, history) {
  let chat = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`
  // history es tuplas user,ai
  for (tupleElement of history){
    chat+= `<|start_header_id|>user<|end_header_id|>\n\n${tupleElement.user}<|eot_id|>`
    chat+= `<|start_header_id|>assistant<|end_header_id|>\n\n${tupleElement.ai}<|eot_id|>`
  }
  chat+= `<|start_header_id|>user<|end_header_id|>\n\n${userQuery}<|eot_id|>`
  return chat;
}


async function getCompletionFromLocalLLM(systemPrompt, text) {
  try {
    // Send a POST request to your local LLM server
    const response = await axios.post(
      LLM_SERVER_URL,
      {
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        prompt: createChatTemplate(systemPrompt, text),
        max_tokens: 70,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const completion = response.data.choices[0].text;
    return completion;
  } catch (error) {
    console.error("Error:", error);
    console.log("the error issssss ", error)
    return "Failed to get completion from local LLM.";
  }
}

///////////***************************************/

async function getBotInitialReply(userFid,userChoice) {
  // first in chat after stars
  // const userSpecificInformation = await getUserSpecificInformation(userFid);
  try {
    const user = await prisma.user.findUnique({ where: { fid: userFid } });

    const systemPrompt = `You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, you replied over a social post for fun and laughs. Your mission was to tease the user by replying to a post we selected.
    <CONTEXT>This were some of the recent user posts ${user.casts.join(', ')} and
    the descriptions (bios) of the most relevant people that this user was following: ${user.followingBios.join(', ')} You have already replied and the user wants to chat.</CONTEXT>`;

    const dataResponse = await getCompletionFromLocalLLM(systemPrompt, 
      `<INSTRUCTION>Give an ice-breaker text to intrigue and make the person chat under 250 characters, teasing the person that will read. Repeat only with your reply.
      Don't confront the user with this info, but in your previous fun reply the user rated you in a scale of 1,2,3 and chose ${userChoice}</INSTRUCTION>`
      
    );
    return dataResponse;
  } catch (error) {
    return "hello world";
  }
}

async function replyToThisCast(castHash, fullUrl) {
  // first LLM call to reply
  try {
    
    const systemPrompt = `You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, the idea is to make the person laugh from your quick witted humor, replying over a social post for lols. Reply only with your reply. Your mission is to tease the user by replying to a post selected.`;
    /* const textForReplying = await getCompletionFromLocalLLM(
      systemPrompt,
      `<INSTRUCTION>Please reply to the message input with less than 250 characters, only with the reply, teasing the person that will read. Your answer will be the reply to the following cast:${cast.text}</INSTRUCTION>`
    ); */
    let textForReplying = "hello world";
    console.log('the textForReplying is: ', textForReplying);
    let castOptions = {
        text: textForReplying,
        embeds: [
          { url:`${fullUrl}/farhack/bot` },
        ],
        parent: castHash,
        signer_uuid: process.env.NEYNAR_ANKY_SIGNER,
      };
    try {
        console.log("right before sending this to neynar, the castOptions are: ", castOptions, process.env.NEYNAR_API_KEY)
        const response = await axios.post(
          "https://api.neynar.com/v2/farcaster/cast",
          castOptions,
          {
            headers: {
              api_key: process.env.NEYNAR_API_KEY,
            },
          }
        );
        console.log("the response from neynar is: ", response);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
  } catch (error) {
    console.log("there was an error talking to the bo1t", error);
    return {success:false};
  }
}

async function talkToBot(userFid, userText) {
  // chat
  try {
    const user = await prisma.user.findUnique({ where: { fid: userFid } });
    const systemPrompt = `reply something funny to the motherfucking user. You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, you replied a user's social post for fun and laughs. Your mission was to tease the user by replying to a post we selected.
    <CONTEXT>This were some of the recent user posts ${user.casts.join(', ')}. You have already replied to the user, and he has started chatting with you voluntarily. Reply only with your reply.</CONTEXT>
    <INSTRUCTION>Please reply to the user's latest chat message, only with the reply, with less than 250 characters</INSTRUCTION>`;

    const dataResponse = await getCompletionFromLocalLLM(
      systemPrompt,
      userText
    );
    return dataResponse;
  } catch (error) {
    console.log("there was an error talking to the bo2t", error);
    return "";
  }
}

async function castAnonymouslyWithFrame(text, irysReceiptHash, fullUrl) {
    try {
        console.log('inside the cast anonymously with frame function');
        let embeds = [];
        if(text.length > 320) {
            text = `${text.slice(0,300)}...`;
            embeds = [
                { url:`${fullUrl}/frames/cast?cid=${irysReceiptHash}` },
              ];
        }
        let castOptions = {
            text: text,
            embeds: embeds,
            parent: "https://warpcast.com/~/channel/anky",
            signer_uuid: process.env.NEYNAR_ANKY_SIGNER,
          };
        try {
            console.log("right before sending this to neynar, the castOptions are: ", castOptions, process.env.NEYNAR_API_KEY)
            const response = await axios.post(
              "https://api.neynar.com/v2/farcaster/cast",
              castOptions,
              {
                headers: {
                  api_key: process.env.NEYNAR_API_KEY,
                },
              }
            );
            console.log("the response from neynar is: ", response);
            return { success: true, castHash: response.data.cast.hash };
        } catch (error) {
            console.error(error);
            return { success: false };
        }
      } catch (error) {
        console.log("there was an error talking to the bo1t", error);
        return {success:false};
      }
}

module.exports = {
    getCompletionFromLocalLLM, 
    replyToThisCast,
    castAnonymouslyWithFrame
}