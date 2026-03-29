import { log } from "./utils";

function findChatInput() {
  return document.querySelector(".ProseMirror");
}

function setInputValue(input, value) {
  if (input) {
    input.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, value);
  } else {
    log("ERROR: no input in setInputValue");
  }
}

export async function submitToolResult(toolCall, result) {
  const message = `<tool_result>
<name>${toolCall.name}</name>
<output>
${result}
</output>
</tool_result>`;

  log("[AutoSubmit] Waiting for chat input to be ready...");

  const input = findChatInput();

  log("[AutoSubmit] Input ready, submitting tool result for:", toolCall.name);

  setInputValue(input, message);
}
