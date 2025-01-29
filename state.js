//How does my state look like?

let state = {
  contract: {
    text: "",
    terms: {
      startDate: "",
      endDate: "",
      cancellation: {
        text: "",
      },
      formatted: false,
      spelling: false,
      guidelines: false,
      feedback: false,
    },
    communication: {
      email: false,
    }
  }
}


export function updateState(newState) {
  state = { ...state, ...newState };
}

export function getState() {
  return state;
}

