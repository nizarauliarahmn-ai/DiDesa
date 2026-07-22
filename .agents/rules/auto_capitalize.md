# Auto Capitalization Standard for Text Inputs

## Principles
1. **Title Case Transformation**: Every text input field handling proper nouns, titles, names, addresses, village/district names, or general descriptions must automatically format inputs to Title Case (capitalizing the first letter of each word).
2. **User Convenience**: Users should not be required to manually press `Shift` to capitalize words.
3. **Implementation Invariants**:
   - For form input fields in React/JSX, format the state value using a title casing helper (e.g. `capitalizeWords(val)`) on input change or blur.
   - For displayed values in document previews or tables, ensure proper casing helper or CSS class (`capitalize` / `uppercase`) is applied.
