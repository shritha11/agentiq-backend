export async function fileQueueBuilderNode(
  state
) {
  const files =
    state?.projectStructure?.files ||
    [];

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