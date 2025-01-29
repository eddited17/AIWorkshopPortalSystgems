//this file includes samples for structured output and few shot learning
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { managementAgentTools } from './functions.js';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemMessage = `
You are the MANAGEMENT agent, orchestrating the entire contract process.
You have these 'handoff' functions:
 - handoffToTermsAgent
 - handoffToCheckerAgent
 - handoffToCommunicationAgent

You also can do your own Management tasks with your own tools.

After every finished agent call, you can update the state with the newState tool.

When you want to pass control, call one of the 'handoff' functions (like "handoffToTermsAgent"), 
and wait until that sub-agent returns. Then continue or finish.
Eventually, produce a final answer for the user when done.

The current state is:
{{currentState}}
`

// 1. The ManagementAgent loop
async function runManagementAgent() {
  let mgmtMessages = [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: "Please process Contract #101 from start to finish!",
    },
  ];

  while (true) {

    const currentState = getState();
    //update system message with current state
    mgmtMessages[0].content = systemMessage.replace("{{currentState}}", JSON.stringify(currentState));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: mgmtMessages,
      // Include *all* relevant tools for Management's usage, 
      // including these 'handoff' functions, plus any direct Management tools
      tools: managementAgentTools,
      store: true,
    });

    const msg = response.data.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // The ManagementAgent gave a final text answer => done
      console.log("FINAL ANSWER:", msg.content);
      break;
    }

    // Check any tool_calls
    for (const call of msg.tool_calls) {
      const { name, arguments: rawArgs } = call.function;
      if (name === "transferToTermsAgent") {
        // parse doc ID or whatever
        await runTermsAgent(); // after it returns, we add a short "Ok, Terms done" message and continue
        mgmtMessages.push(msg);
        mgmtMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ result: "TermsAgent completed" }),
        });
      } else if (name === "transferToCheckerAgent") {
        await runCheckerAgent();
        mgmtMessages.push(msg);
        mgmtMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ result: "CheckerAgent completed" }),
        });
      } else if (name === "transferToCommunicationAgent") {
        const result = await runCommunicationAgent();
        mgmtMessages.push(msg);
        mgmtMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ result }),
        });
      } else {
        // Possibly a direct Management tool call (like editState, loadDocumentForMgmt, etc.)
        const parsed = JSON.parse(rawArgs);
        const toolResult = await dispatchManagementTool(name, parsed); 
        mgmtMessages.push(msg);
        mgmtMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }
    }
  }
}

// 2. The TermsAgent loop
async function runTermsAgent() {
  let termsMessages = [
    {
      role: "system",
      content: `
You are the TERMS agent. 
You have TermsAgent-specific tools (like loadContract, checkPeriods, etc.).
When you are done, call "termsTransferToManagement" with your results, and stop.
`,
    },
  ];

  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: termsMessages,
      tools: [ /* only TermsAgent tools + "termsTransferToManagement" */ ],
    });

    const msg = response.data.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      console.log("TermsAgent ended unexpectedly:", msg.content);
      break;
    }
    for (const call of msg.tool_calls) {
      if (call.function.name === "termsTransferToManagement") {
        console.log("TermsAgent => returning to management");
        return; // done, exit TermsAgent loop
      }
      // Otherwise, call the local Terms tool
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await dispatchTermsTool(call.function.name, args);
      termsMessages.push(msg);
      termsMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}

// 3. The CheckerAgent loop
async function runCheckerAgent() {
  let checkerMessages = [
    {
      role: "system",
      content: `
You are the CHECKER agent.
You have checker tools (loadDocumentForChecker, checkSpelling, etc.).
When done, call "checkerTransferToManagement" and stop.
`,
    },
  ];

  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: checkerMessages,
      tools: [ /* only CheckerAgent tools + "checkerTransferToManagement" */ ],
    });

    const msg = response.data.choices[0].message;
    if (!msg.tool_calls) {
      console.log("CheckerAgent ended unexpectedly:", msg.content);
      break;
    }
    for (const call of msg.tool_calls) {
      if (call.function.name === "checkerTransferToManagement") {
        console.log("CheckerAgent => returning to management");
        return;
      }
      // dispatch to the checker tools
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await dispatchCheckerTool(call.function.name, args);
      checkerMessages.push(msg);
      checkerMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}

// 4. The CommunicationAgent loop
async function runCommunicationAgent() {
  let commsMessages = [
    {
      role: "system",
      content: `
You are the COMMUNICATION agent.
Use your tools for signing, emailing, negotiating, etc.
When done, call "commTransferToManagement" and stop.
`,
    },
  ];

  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: commsMessages,
      tools: [ /* CommunicationAgent tools + "commTransferToManagement" */ ],
    });

    const msg = response.data.choices[0].message;
    if (!msg.tool_calls) {
      console.log("CommunicationAgent ended unexpectedly:", msg.content);
      break;
    }
    for (const call of msg.tool_calls) {
      if (call.function.name === "commTransferToManagement") {
        console.log("CommunicationAgent => returning to management");
        return;
      }
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await dispatchCommunicationTool(call.function.name, args);
      commsMessages.push(msg);
      commsMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}

runManagementAgent();
