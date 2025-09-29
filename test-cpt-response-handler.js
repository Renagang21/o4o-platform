// Test script for CPT response handler logic

// Simulate the response handler logic from CPTDashboardToolset.tsx
function handleCPTResponse(responseData) {
  let cptData = [];
  
  if (Array.isArray(responseData)) {
    cptData = responseData;
  } else if (responseData && typeof responseData === 'object') {
    if (Array.isArray(responseData.data)) {
      cptData = responseData.data;
    } else if (responseData.success && Array.isArray(responseData.data)) {
      cptData = responseData.data;
    }
  }
  
  return cptData;
}

// Test cases
const testCases = [
  { name: "undefined", input: undefined, expected: [] },
  { name: "null", input: null, expected: [] },
  { name: "empty object", input: {}, expected: [] },
  { name: "object with null data", input: { data: null }, expected: [] },
  { name: "object with undefined data", input: { data: undefined }, expected: [] },
  { name: "object with false data", input: { data: false }, expected: [] },
  { name: "object with string data", input: { data: "not an array" }, expected: [] },
  { name: "object with object data", input: { data: {} }, expected: [] },
  { name: "success true with null data", input: { success: true, data: null }, expected: [] },
  { name: "success false with array data", input: { success: false, data: [1, 2, 3] }, expected: [1, 2, 3] },
  { name: "success true with array data", input: { success: true, data: [1, 2, 3] }, expected: [1, 2, 3] },
  { name: "direct array", input: [1, 2, 3], expected: [1, 2, 3] },
  { name: "nested object with array", input: { data: { items: [1, 2, 3] } }, expected: [] },
];

console.log("Testing CPT Response Handler\n");
console.log("=" .repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = handleCPTResponse(test.input);
  const success = JSON.stringify(result) === JSON.stringify(test.expected);
  
  console.log(`\nTest: ${test.name}`);
  console.log(`Input: ${JSON.stringify(test.input)}`);
  console.log(`Expected: ${JSON.stringify(test.expected)}`);
  console.log(`Result: ${JSON.stringify(result)}`);
  console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (success) passed++;
  else failed++;
});

console.log("\n" + "=" .repeat(50));
console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
console.log(`Success Rate: ${(passed / testCases.length * 100).toFixed(1)}%`);