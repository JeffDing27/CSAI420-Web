const SEED_STEP_POINTS = [
  3615, 1165, 756, 309, 200, 172, 166, 171, 166, 172, 171, 186, 172, 180, 165,
  179, 192, 172, 178, 173, 172, 180, 165, 179, 192, 172, 178, 173, 178, 180,
];

const SEED_TEST_TIME = 11846;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function randomBetween(minimum, maximum, random) {
  return minimum + (maximum - minimum) * random();
}

function randomIntBetween(minimum, maximum, random) {
  return Math.round(randomBetween(minimum, maximum, random));
}

function buildStepPoints(random) {
  return SEED_STEP_POINTS.map((seedValue, index) => {
    const variationRatio = index === 0 ? 0.18 : 0.14;
    const lowerBound = Math.max(
      50,
      Math.round(seedValue * (1 - variationRatio)),
    );
    const upperBound = Math.round(seedValue * (1 + variationRatio));
    return randomIntBetween(lowerBound, upperBound, random);
  });
}

export function buildRapidStepPayload({ customer, deviceId }, options = {}) {
  const random = options.random ?? Math.random;
  const stopTime = options.now ?? Date.now();
  const stepPoints = buildStepPoints(random);
  const testTime = clamp(
    randomIntBetween(SEED_TEST_TIME - 1400, SEED_TEST_TIME + 1400, random),
    9000,
    16000,
  );
  const startTime = stopTime - testTime;

  return {
    customer,
    startTime,
    stepPoints,
    stopTime,
    testTime,
    totalSteps: stepPoints.length,
    deviceId,
  };
}
