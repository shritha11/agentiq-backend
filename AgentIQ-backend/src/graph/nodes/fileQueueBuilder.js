export async function fileQueueBuilderNode(state) {
  const files =
    state?.projectStructure?.files || [];

  const prompt =
    (state.userPrompt || "").toLowerCase();

  const hasExistingFiles =
    Object.keys(
      state.generatedFiles || {}
    ).length > 0;

  // EDIT MODE
  if (hasExistingFiles) {

    let queue = [];

    if (
      prompt.includes("navbar") ||
      prompt.includes("nav") ||
      prompt.includes("logo") ||
      prompt.includes("menu") ||
      prompt.includes("header")
    ) {
      queue = ["/Navbar.js"];
    }

    else if (
      prompt.includes("hero") ||
      prompt.includes("headline") ||
      prompt.includes("title") ||
      prompt.includes("subtitle") ||
      prompt.includes("background")
    ) {
      queue = ["/Hero.js"];
    }

    else if (
      prompt.includes("feature") ||
      prompt.includes("features") ||
      prompt.includes("service") ||
      prompt.includes("card")
    ) {
      queue = ["/Features.js"];
    }

    else if (
      prompt.includes("footer")
    ) {
      queue = ["/Footer.js"];
    }

    // fallback
    else {
      queue = ["/Navbar.js"];
    }

    console.log(
      "EDIT MODE QUEUE:",
      queue
    );

    return {
      generationQueue: queue,
      currentStep: "queueBuilder",
      steps: [
        `Edit Queue: ${queue.join(", ")}`
      ],
    };
  }

  // NORMAL GENERATION
  const queue = [
    ...files.filter(
      (f) => f !== "/App.js"
    ),
    "/App.js",
  ];

  return {
    generationQueue: queue,
    currentStep: "queueBuilder",
    steps: [
      "Queue: File generation order created",
    ],
  };
}