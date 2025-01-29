import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/***************************************************************************
 * 1. DEFINE "TOOL FUNCTIONS" FOR EACH AGENT
 *    Each tool is a plain JS function (dummy logic here).
 *    They are exposed to the LLM with JSON schema definitions.
 ***************************************************************************/

// ------------------ Terms Agent Tools -------------------
async function loadContract(args) {
  const { documentId } = args;
  console.log("[Tool] loadContract called with documentId:", documentId);
  // Return some dummy text
  return `Contract #${documentId}: Lorem ipsum contract content with dates...`;
}

async function checkPeriods(args) {
  const { contractText } = args;
  console.log("[Tool] checkPeriods called on text:", contractText.slice(0, 50));
  // Dummy
  return { periodStart: "2025-01-01", periodEnd: "2026-01-01" };
}

async function extractDates(args) {
  const { contractText } = args;
  console.log("[Tool] extractDates called on text:", contractText.slice(0, 50));
  // Dummy
  return { startDate: "2025-01-01", endDate: "2026-01-01" };
}

async function findCancellationSection(args) {
  const { contractText } = args;
  console.log("[Tool] findCancellationSection called on text:", contractText.slice(0, 50));
  // Dummy
  return "Cancellation: Must give 30 days notice before end date.";
}

async function extractCancellationInfo(args) {
  const { cancellationSection } = args;
  console.log("[Tool] extractCancellationInfo called on:", cancellationSection);
  // Dummy
  return { noticePeriodDays: 30, method: "Written notice" };
}

async function termsTransferToManagement(args) {
  console.log("[Tool] TermsAgent -> Management with info:", args.info);
  // Could store in DB or pass to next agent in a real system
  return "Transferred Terms Info to Management.";
}

// ------------------ Contract Checker Agent Tools -------------------
async function loadDocumentForChecker(args) {
  const { documentId } = args;
  console.log("[Tool] Checker: loadDocument called with docId:", documentId);
  return "Dummy contract text for CheckerAgent...";
}

async function loadFormattingRules(args) {
  console.log("[Tool] Checker: loadFormattingRules called");
  return "Dummy formatting rules (e.g. Must have page numbers, legal font, etc.)";
}

async function checkFormatting(args) {
  const { contractText, formattingRules } = args;
  console.log("[Tool] checkFormatting called");
  // Dummy
  return { formattingOk: true, details: "Formatting looks good" };
}

async function checkSpelling(args) {
  const { contractText } = args;
  console.log("[Tool] checkSpelling called on:", contractText.slice(0, 50));
  // Dummy
  return { spellingIssues: [] };
}

async function loadGuidelines(args) {
  console.log("[Tool] Checker: loadGuidelines");
  return "Guidelines: Must contain signature line, standard disclaimers, etc.";
}

async function applyGuidelines(args) {
  const { contractText, guidelines } = args;
  console.log("[Tool] applyGuidelines called");
  // Dummy
  return { applied: true, changes: "Minor edits to match guidelines" };
}

async function giveFeedbackToEnvironment(args) {
  console.log("[Tool] Checker: giveFeedbackToEnvironment =>", args.feedback);
  return "Feedback given to environment.";
}

async function checkerTransferToManagement(args) {
  console.log("[Tool] Checker -> Management with info:", args.info);
  return "Transferred Checker Info to Management.";
}

// ------------------ Contract Communication Agent Tools -------------------
async function loadDocumentForComms(args) {
  const { documentId } = args;
  console.log("[Tool] Comms: loadDocument called with docId:", documentId);
  return "Dummy contract text for CommunicationAgent.";
}

async function signing(args) {
  const { contractText } = args;
  console.log("[Tool] signing() => prepare doc for e-sign...", contractText.slice(0, 50));
  return "Signing prepared (dummy).";
}

async function accessSigningSolutions(args) {
  console.log("[Tool] accessSigningSolutions called");
  return ["DocuSign", "AdobeSign"];
}

async function accessEmail(args) {
  console.log("[Tool] accessEmail called");
  return { emailClient: "DummyEmailClient", emailAddress: "dummy@company.com" };
}

async function emailAccess(args) {
  console.log("[Tool] emailAccess => sending with:", args.emailInfo);
  return "Email sent (dummy).";
}

async function projectInfo(args) {
  console.log("[Tool] projectInfo called");
  return { projectName: "Demo Project", manager: "Alice" };
}

async function accessCalls(args) {
  console.log("[Tool] accessCalls called");
  return ["Zoom", "Teams", "Google Meet"];
}

async function accessNegotiatingStrategies(args) {
  console.log("[Tool] accessNegotiatingStrategies called");
  return ["Strategy A: Offer discount", "Strategy B: Extend contract term"];
}

async function commTransferToManagement(args) {
  console.log("[Tool] Communication -> Management with info:", args.info);
  return "Transferred Communication Info to Management.";
}

// ------------------ Contract Management Agent Tools -------------------
async function loadDocumentForMgmt(args) {
  const { documentId } = args;
  console.log("[Tool] Mgmt: loadDocument called with docId:", documentId);
  return "Contract text from Management perspective...";
}

async function accessState(args) {
  console.log("[Tool] Mgmt: accessState => returning dummy state");
  return { currentStatus: "Draft", owners: ["Alice", "Bob"] };
}

async function editState(args) {
  console.log("[Tool] Mgmt: editState => merging with existing state:", args.newState);
  return "State updated (dummy).";
}

async function transferToTermsAgent(args) {
  const { documentId } = args;
  console.log("[Tool] Mgmt -> TermsAgent with docId:", documentId);
  return "Document passed to TermsAgent.";
}

async function transferToCommunicationAgent(args) {
  const { documentId } = args;
  console.log("[Tool] Mgmt -> CommunicationAgent with docId:", documentId);
  return "Document passed to CommunicationAgent.";
}

async function transferToCheckerAgent(args) {
  const { documentId } = args;
  console.log("[Tool] Mgmt -> CheckerAgent with docId:", documentId);
  return "Document passed to CheckerAgent.";
}

/***************************************************************************
 * 2. LIST OF ALL "TOOLS" IN OPENAI FUNCTION-CALL FORMAT
 *    We define name, description, and JSON schema for each.
 ***************************************************************************/
// Terms Agent Tools
export const termsAgentTools = [
  {
    type: "function",
    function: {
      name: "loadContract",
      description: "Loads the contract text for TermsAgent to process",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "checkPeriods",
      description: "Analyzes contract text for periods (start, end)",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
        },
        required: ["contractText"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "extractDates",
      description: "Extracts start/end dates from contract text",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
        },
        required: ["contractText"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "findCancellationSection",
      description: "Locates cancellation section in contract text",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
        },
        required: ["contractText"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "extractCancellationInfo",
      description: "Extracts relevant info from cancellation section text",
      parameters: {
        type: "object",
        properties: {
          cancellationSection: { type: "string" },
        },
        required: ["cancellationSection"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "termsTransferToManagement",
      description: "Transfer control back to Management with Terms info",
      parameters: {
        type: "object",
        properties: {
          info: { type: "string", description: "Information to pass back" },
        },
        required: ["info"],
      },
    }
  },
];

// Checker Agent Tools
export const checkerAgentTools = [
  {
    type: "function",
    function: {
      name: "loadDocumentForChecker",
      description: "Load document for Checker Agent to process",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "loadFormattingRules",
      description: "Load formatting rules for contract checking",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "checkFormatting",
      description: "Check contract formatting against rules",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
          formattingRules: { type: "string" },
        },
        required: ["contractText", "formattingRules"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "checkSpelling",
      description: "Check contract for spelling issues",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
        },
        required: ["contractText"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "loadGuidelines",
      description: "Load contract guidelines",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "applyGuidelines",
      description: "Apply guidelines to contract",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
          guidelines: { type: "string" },
        },
        required: ["contractText", "guidelines"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "giveFeedbackToEnvironment",
      description: "Give feedback about contract to environment",
      parameters: {
        type: "object",
        properties: {
          feedback: { type: "string" },
        },
        required: ["feedback"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "checkerTransferToManagement",
      description: "Transfer control back to Management with Checker info",
      parameters: {
        type: "object",
        properties: {
          info: { type: "string", description: "Information to pass back" },
        },
        required: ["info"],
      },
    }
  }
];

// Communication Agent Tools
export const communicationAgentTools = [
  {
    type: "function",
    function: {
      name: "loadDocumentForComms",
      description: "Load document for Communication Agent",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "signing",
      description: "Prepare document for e-signing",
      parameters: {
        type: "object",
        properties: {
          contractText: { type: "string" },
        },
        required: ["contractText"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "accessSigningSolutions",
      description: "Get available e-signing solutions",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "accessEmail",
      description: "Access email client information",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "emailAccess",
      description: "Send email with contract information",
      parameters: {
        type: "object",
        properties: {
          emailInfo: { type: "string" },
        },
        required: ["emailInfo"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "projectInfo",
      description: "Get project information",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "accessCalls",
      description: "Get available call platforms",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "accessNegotiatingStrategies",
      description: "Get available negotiating strategies",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "commTransferToManagement",
      description: "Transfer control back to Management with Communication info",
      parameters: {
        type: "object",
        properties: {
          info: { type: "string", description: "Information to pass back" },
        },
        required: ["info"],
      },
    }
  }
];

// Management Agent Tools
export const managementAgentTools = [
  {
    type: "function",
    function: {
      name: "loadDocumentForMgmt",
      description: "Load document for Management Agent",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "accessState",
      description: "Access current contract state",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "updateState",
      description: "Access current contract state",
      parameters: {
        type: "object",
        "properties": {
          "newState": {
            "type": "object",
            "description": "New state to merge",
            "properties": {
              "contract": {
                "type": "object",
                "properties": {},
                "required": []
              }
            }
          }
        },
        required: ["newState"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "editState",
      description: "Edit contract state",
      parameters: {
        type: "object",
        properties: {
          newState: { type: "object", description: "New state to merge" },
        },
        required: ["newState"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "transferToTermsAgent",
      description: "Transfer control to Terms Agent",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "transferToCommunicationAgent",
      description: "Transfer control to Communication Agent",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  },
  {
    type: "function",
    function: {
      name: "transferToCheckerAgent",
      description: "Transfer control to Checker Agent",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document" },
        },
        required: ["documentId"],
      },
    }
  }
];

// Combined tools array for backward compatibility
export const functions = [
  ...termsAgentTools,
  ...checkerAgentTools,
  ...communicationAgentTools,
  ...managementAgentTools
];

/***************************************************************************
 * 3. FUNCTION DISPATCHER
 *    When the LLM calls a function, we dispatch to the correct local JS func.
 ***************************************************************************/
async function functionDispatcher(name, args) {
  switch (name) {
    // TermsAgent
    case "loadContract": return loadContract(args);
    case "checkPeriods": return checkPeriods(args);
    case "extractDates": return extractDates(args);
    case "findCancellationSection": return findCancellationSection(args);
    case "extractCancellationInfo": return extractCancellationInfo(args);
    case "termsTransferToManagement": return termsTransferToManagement(args);

    // CheckerAgent
    case "loadDocumentForChecker": return loadDocumentForChecker(args);
    case "loadFormattingRules": return loadFormattingRules(args);
    case "checkFormatting": return checkFormatting(args);
    case "checkSpelling": return checkSpelling(args);
    case "loadGuidelines": return loadGuidelines(args);
    case "applyGuidelines": return applyGuidelines(args);
    case "giveFeedbackToEnvironment": return giveFeedbackToEnvironment(args);
    case "checkerTransferToManagement": return checkerTransferToManagement(args);

    // CommunicationAgent
    case "loadDocumentForComms": return loadDocumentForComms(args);
    case "signing": return signing(args);
    case "accessSigningSolutions": return accessSigningSolutions(args);
    case "accessEmail": return accessEmail(args);
    case "emailAccess": return emailAccess(args);
    case "projectInfo": return projectInfo(args);
    case "accessCalls": return accessCalls(args);
    case "accessNegotiatingStrategies": return accessNegotiatingStrategies(args);
    case "commTransferToManagement": return commTransferToManagement(args);

    // ManagementAgent
    case "loadDocumentForMgmt": return loadDocumentForMgmt(args);
    case "accessState": return accessState(args);
    case "editState": return editState(args);
    case "transferToTermsAgent": return transferToTermsAgent(args);
    case "transferToCommunicationAgent": return transferToCommunicationAgent(args);
    case "transferToCheckerAgent": return transferToCheckerAgent(args);

    default:
      throw new Error("No function found: " + name);
  }
}