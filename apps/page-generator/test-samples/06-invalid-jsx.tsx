/**
 * Test Sample 6: Invalid JSX (Error Test)
 * Expected: Parsing error
 * Placeholders: N/A
 */
export default function InvalidJSX() {
  return (
    <div className="container">
      <h1 className="text-4xl">Unclosed Heading
      <p>This should cause parsing error</p>
      <button>Click Me
    </div>
  );
}
